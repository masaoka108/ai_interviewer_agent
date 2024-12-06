require 'google/cloud/ai/generative/v1'
require 'google/cloud/ai/generative/v1/generative_pb'
require 'google/cloud/ai/generative/v1/generative_services_pb'

class Api::V1::InterviewsController < ApplicationController
  def show_by_url
    Rails.logger.info "Received request for interview with URL: #{params[:url]}"
    
    begin
      interview = Interview.find_by!(interview_url: params[:url])
      Rails.logger.info "Found interview: #{interview.inspect}"
      
      render json: interview.as_json(
        include: {
          job_posting: {
            only: [:id, :title, :description, :requirements]
          },
          custom_questions: {
            only: [:id, :question_text, :order]
          }
        },
        methods: [:resume_url, :cv_url, :recording_url]
      )
    rescue ActiveRecord::RecordNotFound => e
      Rails.logger.error "Interview not found: #{e.message}"
      render json: { error: '面接が見つかりません' }, status: :not_found
    rescue => e
      Rails.logger.error "Unexpected error: #{e.message}\n#{e.backtrace.join("\n")}"
      render json: { error: '予期せぬエラーが発生しました' }, status: :internal_server_error
    end
  end

  def generate_questions
    interview = Interview.find(params[:id])
    job_posting = interview.job_posting

    # GEMINIクライアントの設定
    gemini = Google::Cloud::AI::Generative::V1::GenerativeService::Client.new do |config|
      config.credentials = { api_key: 'AIzaSyAugifzU1t_a5DcmeG-fKCcNTkee-HR1Nk' }
    end

    # プロンプトの作成
    prompt = <<~PROMPT
      あなたは面接官です。以下の情報を基に、候補者に対する具体的な質問を5つ生成してください。
      
      【募集要項】
      #{job_posting.description}
      
      【応募要件】
      #{job_posting.requirements}
      
      【候補者の履歴書・職務経歴書の内容】
      #{interview.resume_content}
      #{interview.cv_content}
      
      質問は以下の基準で生成してください：
      1. 候補者の経験と募集要件のマッチングを確認する質問
      2. 技術力や専門知識を確認する質問
      3. チームワークやコミュニケーション能力を確認する質問
      4. 志望動機や将来のキャリアビジョンを確認する質問
      5. 具体的な課題解決能力を確認する質問
      
      回答は質問のみをJSON形式で出力してください。
      例：
      {
        "questions": [
          "質問1",
          "質問2",
          "質問3",
          "質問4",
          "質問5"
        ]
      }
    PROMPT

    # GEMINIに質問を生成させる
    request = Google::Cloud::AI::Generative::V1::GenerateContentRequest.new(
      model: 'models/gemini-pro',
      contents: [
        Google::Cloud::AI::Generative::V1::Content.new(
          parts: [
            Google::Cloud::AI::Generative::V1::Part.new(
              text: prompt
            )
          ]
        )
      ]
    )

    begin
      response = gemini.generate_content(request)
      questions = JSON.parse(response.candidates.first.content.parts.first.text)['questions']

      # 生成された質問をデータベースに保存
      questions.each do |question|
        interview.custom_questions.create!(
          question_text: question
        )
      end

      render json: { message: '質問の生成が完了しました', questions: questions }, status: :ok
    rescue => e
      render json: { error: '質問の生成に失敗しました', details: e.message }, status: :unprocessable_entity
    end
  end

  def upload_document
    interview = Interview.find(params[:id])
    
    unless params[:file].present?
      return render json: { error: 'ファイルが指定されていません' }, status: :unprocessable_entity
    end

    begin
      file = params[:file]
      type = params[:type]

      # ファイルの検証
      unless ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].include?(file.content_type)
        return render json: { error: '許可されていないファイル形式です' }, status: :unprocessable_entity
      end

      if file.size > 10.megabytes
        return render json: { error: 'ファイルサイズが大きすぎます（上限: 10MB）' }, status: :unprocessable_entity
      end

      # ファイルの保存とパス更新
      filename = "#{type}_#{Time.current.to_i}_#{file.original_filename}"
      filepath = Rails.root.join('public', 'uploads', filename)
      
      FileUtils.mkdir_p(File.dirname(filepath))
      File.open(filepath, 'wb') do |f|
        f.write(file.read)
      end

      # ファイルの内容を読み取り（PDFの場合）
      content = if file.content_type == 'application/pdf'
        reader = PDF::Reader.new(filepath)
        reader.pages.map(&:text).join("\n")
      else
        # Wordファイルの場合は別途処理が必要
        # TODO: Word文書の読み取り処理を実装
        ''
      end

      # インタビューレコードの更新
      case type
      when 'resume'
        interview.update!(
          resume_url: "/uploads/#{filename}",
          resume_content: content
        )
      when 'cv'
        interview.update!(
          cv_url: "/uploads/#{filename}",
          cv_content: content
        )
      end

      render json: { message: 'ファイルのアップロードが完了しました' }, status: :ok
    rescue => e
      render json: { error: 'ファイルのアップロードに失敗しました', details: e.message }, status: :unprocessable_entity
    end
  end

  # 他のアクション...
end 