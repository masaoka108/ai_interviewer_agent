Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :interviews do
        member do
          post 'upload-document'
          post 'generate-questions'
          post 'upload-recording'
        end
        collection do
          get 'by-url/:url', to: 'interviews#show_by_url'
        end
      end
    end
  end
end 