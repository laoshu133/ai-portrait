'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { GenerationRecord } from '@/lib/history';
import './history.css';

const typeLabels: Record<string, string> = {
  id: '证件照',
  festival: '节日照',
  memorial: '纪念照',
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
    // 跳转到上传页面，带有类型参数
    window.location.href = `/upload?type=${record.type}`;
  }

  if (!isSignedIn) {
    return (
      <div className="container">
        <div className="login-prompt">
          <h1>请先登录</h1>
          <p>登录后才能查看您的生成历史记录</p>
          <Link href="/sign-in" className="btn btn-primary">
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>我的生成历史</h1>
        <Link href="/" className="back-link">← 返回首页</Link>
      </div>

      {history.length === 0 ? (
        <div className="empty">
          <p>还没有生成记录</p>
          <Link href="/upload" className="btn btn-primary">
            开始生成第一张图片
          </Link>
        </div>
      ) : (
        <div className="history-list">
          {history.map((record) => (
            <div key={record.id} className="history-card">
              <div className="card-image">
                <img src={record.generatedUrl} alt="Generated image" />
              </div>
              <div className="card-info">
                <div className="card-type">
                  <span className="badge">{typeLabels[record.type] || record.type}</span>
                  <span className="date">
                    {new Date(record.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="card-actions">
                  <button
                    onClick={() => handleRegenerate(record)}
                    className="btn btn-secondary"
                    disabled={deletingId !== null}
                  >
                    重新生成
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="btn btn-danger"
                    disabled={deletingId === record.id}
                  >
                    {deletingId === record.id ? '删除中...' : '删除'}
                  </button>
                </div>
              </div>
              <a 
                href={record.generatedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="download-link"
                download
              >
                下载原图 ↗
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
