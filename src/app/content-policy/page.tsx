'use client';

import { useState, useEffect } from 'react';
import { zh, en } from '@/i18n/translations';
import Link from 'next/link';

export default function ContentPolicy() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = lang === 'zh' ? zh : en;

  // 初始化语言：优先读localStorage，其次读浏览器accept-language
  useEffect(() => {
    const savedLang = localStorage.getItem('lang');
    if (savedLang === 'zh' || savedLang === 'en') {
      setLang(savedLang);
    } else {
      // 读取浏览器语言
      const browserLang = navigator.language || '';
      setLang(browserLang.startsWith('zh') ? 'zh' : 'en');
    }
  }, []);

  // 切换语言并保存到localStorage
  const toggleLang = () => {
    const newLang = lang === 'zh' ? 'en' : 'zh';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20"></div>
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="银龄相馆" className="w-10 h-10" />
              <div className="text-3xl font-bold text-orange-900">
                {lang === 'zh' ? '银龄相馆' : 'Silver Portrait'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLang}
                className="text-sm text-gray-600 hover:text-orange-600"
              >
                {lang === 'zh' ? 'EN' : '中文'}
              </button>
              <Link
                href="/"
                className="px-4 py-2 text-orange-600 hover:text-orange-700 font-medium"
              >
                {lang === 'zh' ? '返回首页' : 'Back to Home'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {lang === 'zh' ? '内容安全政策' : 'Content Safety Policy'}
          </h1>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            {lang === 'zh' ? (
              <>
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">1. 内容审核机制</h2>
                  <p>我们建立了严格的内容审核机制，所有通过本平台生成的图片都会经过以下审核流程：</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>AI 自动内容检测：识别暴力、色情、低俗、违法等违规内容</li>
                    <li>人工抽查复核：对高风险内容进行人工审核</li>
                    <li>用户举报机制：接受用户对违规内容的举报，24小时内处理</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 禁止生成的内容</h2>
                  <p>严格禁止生成以下类型的内容：</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>涉及政治敏感、违反国家法律法规的内容</li>
                    <li>色情、低俗、暴力、恐怖等不良内容</li>
                    <li>侵犯他人肖像权、知识产权等合法权益的内容</li>
                    <li>虚假信息、诈骗相关内容</li>
                    <li>其他违反公序良俗的内容</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 违规处理措施</h2>
                  <p>对于发现的违规内容，我们将采取以下措施：</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>立即删除违规内容，不予生成或展示</li>
                    <li>对多次违规的用户，暂停或永久终止服务</li>
                    <li>涉及违法犯罪的，将主动配合公安机关调查</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">4. 内容安全责任</h2>
                  <p>用户对上传的原始照片和生成内容的合法性负责，如因用户上传违规内容导致的法律责任由用户自行承担。</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">5. 联系我们</h2>
                  <p>如果您发现违规内容或有任何内容安全相关的问题，请随时联系我们的客服邮箱：<a href="mailto:support@aipixbox.com" className="text-orange-600 hover:underline">support@aipixbox.com</a>，我们会在24小时内回复处理。</p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Content Review Mechanism</h2>
                  <p>We have established a strict content review mechanism, all images generated through this platform go through the following review process:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>AI automatic content detection: identify violent, pornographic, vulgar, illegal and other violating content</li>
                    <li>Manual spot check and review: manual review of high-risk content</li>
                    <li>User reporting mechanism: accept user reports of violating content, processed within 24 hours</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Prohibited Content</h2>
                  <p>The generation of the following types of content is strictly prohibited:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Content involving political sensitivity and violating national laws and regulations</li>
                    <li>Pornographic, vulgar, violent, terrorist and other bad content</li>
                    <li>Content that infringes on others' portrait rights, intellectual property rights and other legitimate rights and interests</li>
                    <li>False information, fraud-related content</li>
                    <li>Other content that violates public order and good customs</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Violation Handling Measures</h2>
                  <p>For the violating content found, we will take the following measures:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Immediately delete the violating content, do not generate or display it</li>
                    <li>For users who repeatedly violate the rules, suspend or permanently terminate the service</li>
                    <li>Involving illegal crimes, we will actively cooperate with the public security organs in the investigation</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Content Safety Responsibility</h2>
                  <p>Users are responsible for the legality of the original photos uploaded and the generated content. If the user uploads violating content, the legal responsibility shall be borne by the user.</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Contact Us</h2>
                  <p>If you find violating content or have any content safety related issues, please feel free to contact our customer support email: <a href="mailto:support@aipixbox.com" className="text-orange-600 hover:underline">support@aipixbox.com</a>, we will reply and deal with it within 24 hours.</p>
                </section>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="py-8 bg-gray-900 text-gray-400 text-center mt-12">
        <p>© 2026 {lang === 'zh' ? '银龄相馆' : 'Silver Portrait Studio'}</p>
        <p className="mt-2">
          {lang === 'zh' ? '客服邮箱：' : 'Customer Support: '}
          <a href="mailto:support@aipixbox.com" className="text-orange-400 hover:text-orange-300 transition-colors">
            support@aipixbox.com
          </a>
        </p>
        <div className="mt-4 space-x-4">
          <Link href="/privacy" className="hover:text-white transition-colors">
            {lang === 'zh' ? '隐私政策' : 'Privacy Policy'}
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            {lang === 'zh' ? '服务条款' : 'Terms of Service'}
          </Link>
          <Link href="/content-policy" className="hover:text-white transition-colors">
            {lang === 'zh' ? '内容安全政策' : 'Content Safety Policy'}
          </Link>
        </div>
      </footer>
    </div>
  );
}
