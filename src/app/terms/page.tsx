'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';

export default function TermsOfService() {
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
              <h1 className="text-4xl font-bold text-gray-900 mb-8">服务条款</h1>
              
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 服务描述</h2>
                  <p>
                    银龄相馆提供 AI 形象照生成服务，用户上传照片后，我们使用人工智能技术为用户生成证件照、节日照、纪念照等不同类型的形象照。本服务仅供个人合法使用。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 支付与退款</h2>
                  <p>
                    我们采用额度充值模式，用户购买生成额度后可以使用额度进行照片生成。额度一经购买，概不退款。额度永久有效，不会过期。请根据您的需求选择合适的套餐。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 用户责任</h2>
                  <p>
                    用户承诺：
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>仅上传您本人拥有合法使用权的照片</li>
                    <li>不上传侵犯他人隐私权、肖像权、著作权的内容</li>
                    <li>不使用本服务生成违法、违规、有害的内容</li>
                    <li>不利用本服务进行任何非法活动</li>
                  </ul>
                  <p className="mt-2">
                    如果用户违反上述承诺，我们有权立即终止您的账户使用，并不予退款。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 服务可用性</h2>
                  <p>
                    我们尽力保证服务的稳定可用，但不保证服务永远不会中断或出现错误。我们可能会因为维护、升级等原因暂时中断服务。我们不对服务中断造成的任何损失负责。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. AI 生成结果</h2>
                  <p>
                    AI 生成的照片结果可能存在一定的不准确性。我们尽力提供最好的效果，但不保证每张生成照片都完全符合您的期望。如果生成失败，您的额度不会被扣减。对于生成结果不满意，您可以重新尝试生成，但不支持退款。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. 知识产权</h2>
                  <p>
                    用户上传的照片知识产权归用户所有。AI 生成的照片结果供用户个人使用。本网站的代码、设计、品牌等知识产权归我们所有。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 免责声明</h2>
                  <p>
                    本服务按"现状"提供，不提供任何明示或暗示的保证，包括但不限于对适销性、特定用途适用性的保证。在任何情况下，我们不对因使用本服务产生的任何直接、间接、偶然、特殊、 consequential 损害负责。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 条款修改</h2>
                  <p>
                    我们可能会不时修改本服务条款，修改后的条款将发布在本页面上。您继续使用本服务即表示您接受修改后的条款。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 适用法律</h2>
                  <p>
                    本服务条款受中华人民共和国法律管辖。如发生争议，双方应协商解决，协商不成应向我们运营所在地人民法院提起诉讼。
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 联系我们</h2>
                  <p>
                    如果您对本服务条款有任何问题，请通过网站首页联系我们。
                  </p>
                </section>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
              
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Service Description</h2>
                  <p>
                    Silver Portrait provides AI portrait generation service. After users upload photos, we use artificial intelligence technology to generate different types of portraits such as ID photos, festival photos, and memorial photos. This service is for personal legal use only.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Payment and Refunds</h2>
                  <p>
                    We use a quota recharge model. After users purchase generation quota, they can use the quota to generate photos. Once purchased, quotas are non-refundable. Quotas are permanently valid and never expire. Please choose the appropriate package according to your needs.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Responsibilities</h2>
                  <p>
                    Users promise:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Only upload photos for which you have legal rights</li>
                    <li>Do not upload content that infringes on the privacy rights, portrait rights, or copyrights of others</li>
                    <li>Do not use this service to generate illegal, violating, or harmful content</li>
                    <li>Do not use this service for any illegal activities</li>
                  </ul>
                  <p className="mt-2">
                    If a user violates the above commitments, we have the right to immediately terminate your account usage and will not issue a refund.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Service Availability</h2>
                  <p>
                    We strive to ensure stable and available service, but do not guarantee that the service will never be interrupted or encounter errors. We may temporarily interrupt service due to maintenance, upgrades, and other reasons. We are not responsible for any losses caused by service interruption.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. AI Generated Results</h2>
                  <p>
                    AI-generated photos may have some inaccuracies. We strive to provide the best results, but do not guarantee that every generated photo will fully meet your expectations. If generation fails, your quota will not be deducted. If you are not satisfied with the generated result, you can try again, but we do not support refunds.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
                  <p>
                    The intellectual property of photos uploaded by users belongs to the users. AI-generated photo results are for users' personal use. The intellectual property of the code, design, brand, etc. of this website belongs to us.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Disclaimer</h2>
                  <p>
                    This service is provided "as is" and does not provide any express or implied warranties, including but not limited to implied warranties of merchantability and fitness for a particular purpose. In no event shall we be liable for any direct, indirect, incidental, special, or consequential damages arising out of the use of this service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Modifications to Terms</h2>
                  <p>
                    We may modify these Terms of Service from time to time, and the modified terms will be posted on this page. Your continued use of the service constitutes acceptance of the modified terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Governing Law</h2>
                  <p>
                    These Terms of Service are governed by the laws of the People's Republic of China. If a dispute occurs, the parties should negotiate a solution. If negotiation fails, the dispute shall be submitted to the people's court where we operate.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
                  <p>
                    If you have any questions about these Terms of Service, please contact us through the homepage.
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
