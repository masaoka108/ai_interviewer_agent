import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    // メッセージ送信の処理をここに実装
    setMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}
                className="text-white p-2 hover:bg-indigo-500 rounded-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/" className="flex items-center ml-4">
                <span className="text-xl font-bold text-white hover:text-indigo-100">AI面接官</span>
              </Link>
            </div>

            <div className="flex items-center">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="text-white hover:text-indigo-100 px-3 py-2 transition duration-150"
                >
                  ログアウト
                </button>
              ) : (
                <Link href="/login" className="text-white hover:text-indigo-100 px-3 py-2 transition duration-150">
                  ログイン
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* 左サイドメニュー */}
        <div className={`${isSideMenuOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white shadow-lg overflow-hidden`}>
          {user && (
            <nav className="mt-5 px-2">
              {user.companyId && (
                <>
                  <Link
                    href="/job-postings"
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                      router.pathname === '/job-postings'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    求人管理
                  </Link>

                  <Link
                    href="/base-questions"
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md mt-2 ${
                      router.pathname === '/base-questions'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ベース質問設定
                  </Link>
                </>
              )}
              {user.isSuperuser && (
                <Link
                  href="/admin"
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md mt-2 ${
                    router.pathname === '/admin'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  管理画面
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 bg-gray-50 p-8">
          {children}
        </main>

        {/* 右サイドのAIチャット欄 */}
        <div className="w-80 bg-white shadow-lg flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 flex-1">
                <p className="text-sm">こんにちは！求人管理に関するご質問やお手伝いが必要な場合は、お気軽にお申し付けください。</p>
              </div>
            </div>
            {/* メッセージ履歴をここに表示 */}
          </div>
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="メッセージを入力..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90"
              >
                送信
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* フッター */}
      <footer className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="text-center">
            <div className="text-sm font-medium opacity-90">
              © 2024 AI面接官. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 