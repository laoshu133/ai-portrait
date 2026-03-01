'use client';

import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';

export default function SignUpPage() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-orange-900">
              {lang === 'zh' ? '银龄相馆' : 'Silver Portrait'}
            </Link>
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="text-sm text-gray-600 hover:text-orange-600"
            >
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <SignUp 
          appearance={{
            variables: {
              colorPrimary: '#ea580c',
              colorTextOnPrimaryBackground: '#ffffff',
              colorBackground: '#ffffff',
              colorInputBackground: '#ffffff',
              colorInputText: '#1f2937',
            },
            elements: {
              rootBox: {
                width: '100%',
                maxWidth: '320px',
              },
              card: {
                width: '100%',
                maxWidth: '320px',
                margin: '0 auto',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                borderRadius: '1rem',
              },
              formButtonPrimary: {
                backgroundColor: '#ea580c',
                '&:hover': {
                  backgroundColor: '#c2410c',
                },
              },
              footerActionLink: {
                color: '#ea580c',
              },
            }
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          redirectUrl="/"
        />
      </main>

      {/* Footer */}
      <footer className="py-6 bg-gray-900 text-gray-400 text-center">
        <p>© 2026 {lang === 'zh' ? '银龄相馆' : 'Silver Portrait Studio'}</p>
        <div className="mt-2 space-x-4">
          <Link href="/privacy" className="hover:text-white transition-colors">
            {lang === 'zh' ? '隐私政策' : 'Privacy Policy'}
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            {lang === 'zh' ? '服务条款' : 'Terms of Service'}
          </Link>
        </div>
      </footer>
    </div>
  );
}
