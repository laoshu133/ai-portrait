'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';

export default function PrivacyPolicy() {
  const { isSignedIn } = useUser();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Navigation */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-orange-900">
              {lang === 'zh' ? '银龄相馆' : 'Silver Portrait'}
            </Link>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="text-sm text-gray-600 hover:text-orange-600"
              >
                {lang === 'zh' ? 'EN' : '中文'}
              </button>
              <Link href="/" className="px-3 py-2 text-orange-600 hover:text-orange-700 font-medium text-sm">
                {lang === 'zh' ? '← 首页' : '← Home'}
              </Link>
              {isSignedIn && <UserButton afterSignOutUrl="/" />}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
          {lang === 'zh' ? (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-8">隐私政策</h1>
              
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 信息收集</h2>
                  <p>
                    我们仅收集您上传的照片和生成结果用于提供 AI 形象照生成服务。所有照片存储在加密的云存储中，仅您本人可以访问。我们不会将您的照片用于任何其他用途，不会与第三方共享您的个人照片。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 信息使用</h2>
                  <p>
                    您上传的照片仅用于 AI 模型处理以生成您请求的形象照。AI 处理完成后，原始照片和生成结果保存在您的个人账户中供您下载使用。您可以随时在生成记录页面删除您的照片。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 数据安全</h2>
                  <p>
                    我们采用行业标准的加密技术保护您的数据安全。您的照片存储在 Cloudflare R2 对象存储中，通过权限控制确保只有您能够访问。支付信息由 Creem.io 专业支付平台处理，我们不会存储您的信用卡或支付信息。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 第三方服务</h2>
                  <p>
                    我们使用以下第三方服务来提供本服务：
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Clerk - 用户认证服务</li>
                    <li>Cloudflare R2 - 数据存储服务</li>
                    <li>Creem.io - 支付处理服务</li>
                    <li>Aihubmix - AI 图像生成服务</li>
                  </ul>
                  <p className="mt-2">
                    这些第三方服务均遵循行业隐私标准，您的数据受其隐私政策约束。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 您的权利</h2>
                  <p>
                    您随时可以：
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>访问您的个人照片和生成记录</li>
                    <li>删除您不想要的照片和记录</li>
                    <li>请求导出您的所有数据</li>
                    <li>请求删除您的所有账户数据</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. 政策更新</h2>
                  <p>
                    我们可能会不时更新本隐私政策。更新后的政策将发布在本页面上。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 联系我们</h2>
                  <p>
                    如果您对本隐私政策有任何问题，请通过网站首页联系我们。
                  </p>
                </section>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
              
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information Collection</h2>
                  <p>
                    We only collect the photos you upload and the generated results to provide the AI portrait generation service. All photos are stored in encrypted cloud storage, and only you can access them. We will not use your photos for any other purposes and will not share your personal photos with third parties.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information Usage</h2>
                  <p>
                    Your uploaded photos are only used by AI models to generate the portrait you requested. After AI processing is complete, the original photo and generated result are saved in your personal account for you to download. You can delete your photos at any time from the generation history page.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Data Security</h2>
                  <p>
                    We use industry-standard encryption technology to protect your data security. Your photos are stored in Cloudflare R2 object storage, and access control ensures only you can access them. Payment information is processed by the professional payment platform Creem.io, and we do not store your credit card or payment information.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Third-Party Services</h2>
                  <p>
                    We use the following third-party services to provide this service:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Clerk - User authentication service</li>
                    <li>Cloudflare R2 - Data storage service</li>
                    <li>Creem.io - Payment processing service</li>
                    <li>Aihubmix - AI image generation service</li>
                  </ul>
                  <p className="mt-2">
                    These third-party services follow industry privacy standards, and your data is subject to their privacy policies.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights</h2>
                  <p>
                    You can at any time:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Access your personal photos and generation history</li>
                    <li>Delete photos and records you don't want</li>
                    <li>Request export of all your data</li>
                    <li>Request deletion of all your account data</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Policy Updates</h2>
                  <p>
                    We may update this privacy policy from time to time. The updated policy will be posted on this page.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
                  <p>
                    If you have any questions about this privacy policy, please contact us through the homepage.
                  </p>
                </section>
              </div>
            </>
          )}
        </div>
      </main>

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
