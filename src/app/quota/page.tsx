'use client';

import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { zh, en } from '@/i18n/translations';
import { QUOTA_PRODUCTS, getFormattedPrice } from '@/lib/creem';

export default function QuotaPage() {
  const { isSignedIn, user } = useUser();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = lang === 'zh' ? zh : en;

  // Detect user language from browser
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    setLang(browserLang === 'zh' ? 'zh' : 'en');
    
    // Check for success query param
    const url = new URL(window.location.href);
    if (url.searchParams.get('success') === 'true') {
      setSuccess(true);
    }
    
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      const res = await fetch('/api/quota');
      const data = await res.json();
      if (res.ok) {
        setRemainingQuota(data.remainingQuota);
      }
    } catch (err) {
      console.error('Failed to fetch quota', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (productId: string) => {
    setPurchasing(productId);
    setError(null);
    
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }
      
      // Redirect to Creem checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPurchasing(null);
    }
  };

  // Auto-refresh quota after successful purchase
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        fetchQuota();
        setSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Detect user currency preference based on language
  const getDefaultCurrency = (): 'USD' | 'CNY' | 'EUR' | 'GBP' => {
    if (lang === 'zh') return 'CNY';
    if (lang === 'en') {
      // Could detect geolocation, default to USD for English speakers
      return 'USD';
    }
    return 'USD';
  };

  const currency = getDefaultCurrency();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="银龄相馆" className="w-10 h-10" />
            <div className="text-3xl font-bold text-orange-900">
              {lang === 'zh' ? '银龄相馆' : 'Silver Portrait'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="text-sm text-gray-600 hover:text-orange-600"
            >
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
            <Link
              href="/"
              className="px-3 py-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
            >
              {lang === 'zh' ? '首页' : 'Home'}
            </Link>
            <Link
              href="/history"
              className="px-3 py-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
            >
              {lang === 'zh' ? '生成记录' : 'History'}
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {lang === 'zh' ? '购买生成额度' : 'Buy Generation Quota'}
            </h1>
            <p className="text-xl text-gray-600">
              {lang === 'zh' 
                ? '一次购买，多次生成，方便快捷' 
                : 'Buy once, generate multiple times, convenient and fast'}
            </p>
            
            {/* Current Quota Display */}
            <div className="mt-8 inline-block bg-white rounded-2xl shadow-lg px-8 py-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl">🎫</div>
                <div className="text-left">
                  <p className="text-sm text-gray-600">
                    {lang === 'zh' ? '当前剩余额度' : 'Remaining Quota'}
                  </p>
                  {loading ? (
                    <p className="animate-pulse text-gray-400">Loading...</p>
                  ) : (
                    <p className="text-3xl font-bold text-orange-600">
                      {remainingQuota} {lang === 'zh' ? '次' : 'generations'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {success && (
              <div className="mt-4 bg-green-100 text-green-700 px-6 py-3 rounded-xl inline-block">
                ✅ {lang === 'zh' ? '支付成功！额度已到账' : 'Payment successful! Quota added'}
              </div>
            )}
            
            {error && (
              <div className="mt-4 bg-red-100 text-red-700 px-6 py-3 rounded-xl inline-block">
                ❌ {error}
              </div>
            )}
          </div>

          {/* Product Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {QUOTA_PRODUCTS.map((product) => {
              const isPopular = product.popular;
              const isBestValue = product.bestValue;
              const price = product.prices[currency];
              
              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-3xl p-8 shadow-xl transition-all transform hover:scale-105 border-2 ${
                    isPopular ? 'border-orange-400' : 'border-transparent'
                  } relative overflow-hidden`}
                >
                  {isBestValue && (
                    <div className="absolute -right-12 top-6 bg-green-500 text-white py-1 px-12 transform rotate-45 text-sm font-semibold">
                      {lang === 'zh' ? '最划算' : 'Best Value'}
                    </div>
                  )}
                  {isPopular && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-1 rounded-b-xl text-sm font-semibold">
                      {lang === 'zh' ? '热门' : 'Popular'}
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {lang === 'zh' ? product.name.zh : product.name.en}
                    </h3>
                    <p className="text-gray-600 mb-6 min-h-[40px]">
                      {lang === 'zh' ? product.description.zh : product.description.en}
                    </p>
                    
                    <div className="mb-6">
                      <div className="text-5xl font-bold text-gray-900">
                        {getFormattedPrice(price, currency)}
                      </div>
                      <div className="text-gray-600 mt-2">
                        {product.quota} {lang === 'zh' ? '次生成' : 'generations'}
                      </div>
                      <div className="text-sm text-green-600 mt-1 font-medium">
                        ≈ {getFormattedPrice(price / product.quota, currency)}{' '}
                        {lang === 'zh' ? '/次' : '/generation'}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handlePurchase(product.id)}
                      disabled={purchasing !== null}
                      className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                        isPopular
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-white border-2 border-orange-600 text-orange-600 hover:bg-orange-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {purchasing === product.id
                        ? (lang === 'zh' ? '跳转中...' : 'Redirecting...')
                        : (lang === 'zh' ? '立即购买' : 'Buy Now')
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Features Section */}
          <div className="mt-16 bg-white rounded-3xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {lang === 'zh' ? '为什么选择我们' : 'Why Choose Us'}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  🌍
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {lang === 'zh' ? '全球支付支持' : 'Global Payment Support'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {lang === 'zh' 
                      ? '支持信用卡、PayPal、支付宝、微信支付等多种支付方式'
                      : 'Supports credit cards, PayPal, Alipay, WeChat Pay and more'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  💰
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {lang === 'zh' ? '额度永不过期' : 'Quota Never Expires'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {lang === 'zh' 
                      ? '购买的额度永久有效，想用就用'
                      : 'Your purchased quota never expires, use anytime'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  🔒
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {lang === 'zh' ? '安全支付' : 'Secure Payment'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {lang === 'zh' 
                      ? '由 Creem.io 专业支付平台处理，安全可靠'
                      : 'Processed professionally by Creem.io, secure and reliable'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  💬
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {lang === 'zh' ? '多语言支持' : 'Multi-language Support'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {lang === 'zh' 
                      ? '支持中文和英文，面向全球用户'
                      : 'Supports Chinese and English, for global users'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Back to Home */}
          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              ← {lang === 'zh' ? '返回首页' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-gray-400 text-center">
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
