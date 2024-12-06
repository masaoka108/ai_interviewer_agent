import React from 'react';

interface CandidateLayoutProps {
  children: React.ReactNode;
}

export default function CandidateLayout({ children }: CandidateLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-white text-xl font-semibold">AI面接官</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-white text-sm">
                <span className="opacity-75">面接準備</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 bg-gray-50">
        {children}
      </main>

      {/* フッター */}
      <footer className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-sm">
              <span className="opacity-75">© 2024 AI面接官. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 