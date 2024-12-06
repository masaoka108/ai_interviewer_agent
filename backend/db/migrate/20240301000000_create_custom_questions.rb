class CreateCustomQuestions < ActiveRecord::Migration[7.0]
  def change
    create_table :custom_questions do |t|
      t.references :interview, null: false, foreign_key: true
      t.text :question_text, null: false
      t.integer :order
      t.timestamps
    end
  end
end 