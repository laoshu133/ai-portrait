'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { GenerationRecord, GenerationStatus } from '@/lib/history';
import './history.css';

const typeLabels: Record<string, string> = {
  id: '证件照',
  festival: '节日照',
  memorial: '纪念照',
};

const statusLabels: Record<GenerationStatus, { label: string; className: string }> = {
  success: { label: '成功', className: 'bg-green-100 text-green-700' },
  failed: { label: '失败', className: 'bg-red-100 text-red-700' },
};

export default function HistoryPage() {
  const { isSignedIn, user } = useUser();
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    async function fetchHistory() {
      try {
        const res = await fetch('/api/history');
        const data = await res.json();
        if (data.success) {
          setHistory(data.history);
        } else {
          setError(data.error || '获取历史记录失败');
        }
      } catch (err) {
        setError('网络错误，请重试');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [isSignedIn]);

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这条记录吗？')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setHistory(history.filter(r => r.id !== id));
      } else {
        alert(data.error || '删除失败');
      }
    } catch (err) {
      alert('删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  }

  function handleRegenerate(record: GenerationRecord) {
    // 传递记录ID和类型，上传页面会自动获取原图并开始生成
    window.location.href = `/upload?type=${record.type}&regenerate=${record.id}`;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-lg text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold mb-4">请先登录</h1>
            <p className="text-gray-600 mb-6">登录后才能查看您的生成记录</p>
            <Link
              href="/sign-in"
              className="inline-block px-8 py-4 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors"
            >
              去登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center text-gray-600">
            <p className="text-xl">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-lg text-center">
            <div className="text-6xl mb-4">😢</div>
            <p className="text-red-600">{error}</p>
            <Link href="/" className="mt-6 inline-block text-orange-600 hover:underline">
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-orange-900">
              银龄相馆
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="px-3 py-2 text-orange-600 hover:text-orange-700 font-medium text-sm">
                ← 首页
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              我的生成记录
            </h1>
            <p className="text-lg text-gray-600">
              查看和管理您之前生成的所有照片，失败的记录可以重新生成
            </p>
          </div>

          {history.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 shadow-lg text-center">
              <div className="text-6xl mb-6">📷</div>
              <p className="text-xl text-gray-600 mb-8">还没有生成记录</p>
              <Link
                href="/upload"
                className="inline-block px-8 py-4 bg-orange-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-orange-700 transition-all"
              >
                开始生成第一张照片
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((record) => {
                const statusInfo = statusLabels[record.status];
                return (
                  <div
                    key={record.id}
                    className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                      record.status === 'failed' ? 'opacity-70' : ''
                    }`}
                  >
                    {record.generatedUrl ? (
                      <div className="relative w-full pt-[75%] bg-gray-50">
                        <img
                          src={record.generatedUrl}
                          alt="Generated image"
                          className="absolute top-0 left-0 w-full h-full object-contain max-w-full max-h-full"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full pt-[75%] bg-gray-100 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <div className="text-4xl mb-2">😢</div>
                          <p>生成失败</p>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                            {typeLabels[record.type] || record.type}
                          </span>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(record.timestamp).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      
                      {record.status === 'failed' && record.error && (
                        <div className="mb-3 p-2 bg-red-50 rounded text-xs text-red-600">
                          错误: {record.error}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          onClick={() => handleRegenerate(record)}
                          className="px-3 py-2 bg-orange-100 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                          disabled={deletingId !== null}
                        >
                          重新生成
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                          disabled={deletingId === record.id}
                        >
                          {deletingId === record.id ? '删除中...' : '删除'}
                        </button>
                      </div>
                      
                      {record.generatedUrl && (
                        <a
                          href={record.generatedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="block w-full text-center px-3 py-2 border border-gray-200 text-orange-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          下载原图 ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
