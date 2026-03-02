'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { zh, en } from '@/i18n/translations';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = lang === 'zh' ? zh : en;
  const recordId = params.id as string;

  // Fetch record details
  useEffect(() => {
    async function fetchRecord() {
      try {
        const res = await fetch(`/api/history/${recordId}`);
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || '加载记录失败');
        }
        setRecord(data.record);
      } catch (err: any) {
        console.error('Failed to fetch record:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (isSignedIn && recordId) {
      fetchRecord();
    }
  }, [isSignedIn, recordId]);

  // Redirect if not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <p>{lang === 'zh' ? '正在跳转...' : 'Redirecting...'}</p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3">
                <img src="/logo.png" alt="银龄相馆" className="w-8 h-8" />
                <div className="text-2xl font-bold text-orange-900">
                  {lang === 'zh' ? '银龄相馆' : 'Silver Portrait'}
                </div>
              </Link>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                  className="text-sm text-gray-600 hover:text-orange-600"
                >
                  {lang === 'zh' ? 'EN' : '中文'}
                </button>
                <Link
                  href="/history"
                  className="px-3 py-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
                >
                  {lang === 'zh' ? '生成记录' : 'History'}
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl animate-pulse mb-6">⌛</div>
            <p className="text-xl text-gray-600">
              {lang === 'zh' ? '加载中...' : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error || !record) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3">
                <img src="/logo.png" alt="银龄相馆" className="w-8 h-8" />
                <div className="text-2xl font-bold text-orange-900">
                  {lang === 'zh' ? '银龄相馆' : 'Silver Portrait'}
                </div>
              </Link>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                  className="text-sm text-gray-600 hover:text-orange-600"
                >
                  {lang === 'zh' ? 'EN' : '中文'}
                </button>
                <Link
                  href="/history"
                  className="px-3 py-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
                >
                  {lang === 'zh' ? '生成记录' : 'History'}
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">😢</div>
              <h2 className="text-xl font-bold text-red-600 mb-4">
                {lang === 'zh' ? '记录不存在' : 'Record Not Found'}
              </h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="flex gap-4">
                <Link
                  href="/history"
                  className="flex-1 px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700"
                >
                  {lang === 'zh' ? '返回记录列表' : 'Back to History'}
                </Link>
                <Link
                  href="/"
                  className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                >
                  {lang === 'zh' ? '返回首页' : 'Back Home'}
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isGenerating = record.status === 'failed' ? false : !record.generatedUrl;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="银龄相馆" className="w-8 h-8" />
              <div className="text-2xl font-bold text-orange-900">
                {lang === 'zh' ? '银龄相馆' : 'Silver Portrait'}
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="text-sm text-gray-600 hover:text-orange-600"
              >
                {lang === 'zh' ? 'EN' : '中文'}
              </button>
              <Link
                href="/history"
                className="px-3 py-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                {lang === 'zh' ? '生成记录' : 'History'}
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Record Info */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold">
                {lang === 'zh' ? '生成详情' : 'Generation Detail'}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                record.status === 'success' 
                  ? 'bg-green-100 text-green-700'
                  : record.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700 animate-pulse'
              }`}>
                {record.status === 'success'
                  ? (lang === 'zh' ? '生成成功' : 'Success')
                  : record.status === 'failed'
                  ? (lang === 'zh' ? '生成失败' : 'Failed')
                  : (lang === 'zh' ? '生成中...' : 'Generating')
                }
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">{lang === 'zh' ? '照片类型：' : 'Type: '}</span>
                {record.type === 'id' && (lang === 'zh' ? '证件照' : 'ID Photo')}
                {record.type === 'festival' && (lang === 'zh' ? '节日照' : 'Festival')}
                {record.type === 'memorial' && (lang === 'zh' ? '纪念照' : 'Memorial')}
              </div>
              <div>
                <span className="font-medium">{lang === 'zh' ? '创建时间：' : 'Created: '}</span>
                {new Date(record.createdAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}
              </div>
              {record.type === 'id' && record.purpose && (
                <div>
                  <span className="font-medium">{lang === 'zh' ? '用途：' : 'Purpose: '}</span>
                  {record.purpose}
                </div>
              )}
              {record.type === 'id' && record.background && (
                <div>
                  <span className="font-medium">{lang === 'zh' ? '背景：' : 'Background: '}</span>
                  {record.background}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Original */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {lang === 'zh' ? '原始照片' : 'Original Photo'}
            </h3>
            {record.originalUrl && (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={record.originalUrl} 
                    alt="Original" 
                    className="w-full object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <a
                    href={record.originalUrl}
                    download
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    {lang === 'zh' ? '查看原图' : 'View Original'}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Generated */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {lang === 'zh' ? '生成结果' : 'Generated Result'}
            </h3>
            {isGenerating && (
              <div className="text-center py-12">
                <div className="text-6xl animate-pulse mb-4">🎨</div>
                <p className="text-gray-600">
                  {lang === 'zh' ? '正在生成中...' : 'Generating...'}
                </p>
                <p className="text-sm text-orange-600 mt-2">
                  {lang === 'zh' 
                    ? '可以关闭页面，结果会自动保存' 
                    : 'You can close this page, result will save automatically'}
                </p>
              </div>
            )}
            {record.status === 'failed' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">😢</div>
                <p className="text-red-600 font-medium mb-2">
                  {lang === 'zh' ? '生成失败' : 'Generation Failed'}
                </p>
                {record.error && (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mt-2">
                    {record.error}
                  </p>
                )}
                <div className="mt-6">
                  <Link
                    href={`/upload?type=${record.type}&regenerate=${record.id}`}
                    className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700"
                  >
                    {lang === 'zh' ? '重新生成' : 'Regenerate'}
                  </Link>
                </div>
              </div>
            )}
            {record.generatedUrl && (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={record.generatedUrl} 
                    alt="Generated" 
                    className="w-full object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <a
                    href={record.generatedUrl}
                    target="_blank"
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    {lang === 'zh' ? '查看大图' : 'View Full Size'}
                  </a>
                  <a
                    href={record.generatedUrl}
                    download={`portrait-${record.id}.jpg`}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white text-center rounded-lg text-sm font-medium hover:bg-orange-700"
                  >
                    {lang === 'zh' ? '下载' : 'Download'}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-wrap gap-4">
              <Link
                href="/history"
                className="flex-1 min-w-[140px] px-6 py-3 bg-white border border-gray-200 text-gray-700 text-center font-semibold rounded-xl hover:bg-gray-50"
              >
                {lang === 'zh' ? '返回记录列表' : 'Back to List'}
              </Link>
              {record.status === 'success' && (
                <Link
                  href={`/upload?type=${record.type}&regenerate=${record.id}`}
                  className="flex-1 min-w-[140px] px-6 py-3 bg-orange-600 text-white text-center font-semibold rounded-xl hover:bg-orange-700"
                >
                  {lang === 'zh' ? '基于原图重新生成' : 'Regenerate'}
                </Link>
              )}
            </div>
          </div>
        </div>
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
