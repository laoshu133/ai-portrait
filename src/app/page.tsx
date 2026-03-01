'use client';

import { useState, useRef, useEffect } from 'react';
import { zh, en } from '@/i18n/translations';
import { UserButton, useUser, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';

type PhotoType = 'id' | 'festival' | 'memorial';
type Step = 'home' | 'upload' | 'generating' | 'result';

export default function Home() {
  const { isSignedIn, user } = useUser();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [step, setStep] = useState<Step>('home');
  const [photoType, setPhotoType] = useState<PhotoType | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = lang === 'zh' ? zh : en;

  // Fetch remaining quota for signed in users
  useEffect(() => {
    if (!isSignedIn) return;
    
    async function fetchQuota() {
      try {
        const res = await fetch('/api/quota');
        const data = await res.json();
        if (res.ok) {
          setRemainingQuota(data.remainingQuota);
        }
      } catch (err) {
        console.error('Failed to fetch quota', err);
      }
    }
    fetchQuota();
  }, [isSignedIn]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if user is signed in
    if (!isSignedIn) {
      setShowLoginPrompt(true);
      return;
    }

    setIsUploading(true);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setUploadedImage(previewUrl);
    setIsUploading(false);
    setStep('generating');
    
    // Start generation
    await generateImage(file);
  };

  const generateImage = async (file: File) => {
    setIsGenerating(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', photoType || 'id');
      formData.append('lang', lang);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setShowLoginPrompt(true);
          return;
        }
        throw new Error('Generation failed');
      }

      const data = await response.json();
      setGeneratedImage(data.imageUrl);
      setStep('result');
    } catch (error) {
      console.error(error);
      alert(t.errorGenerate);
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setStep('home');
    setPhotoType(null);
    setUploadedImage(null);
    setGeneratedImage(null);
  };

  const selectPhotoType = (type: PhotoType) => {
    // Check if user is signed in before allowing selection
    if (!isSignedIn) {
      setShowLoginPrompt(true);
      return;
    }
    // Redirect to upload page
    window.location.href = `/upload?type=${type}`;
  };

  const handleStartClick = () => {
    if (!isSignedIn) {
      setShowLoginPrompt(true);
      return;
    }
    window.location.href = '/upload';
  };

  // Login prompt modal
  const LoginPromptModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
        <div className="text-6xl">🔐</div>
        <h2 className="text-2xl font-bold">
          {lang === 'zh' ? '请先登录' : 'Please Sign In'}
        </h2>
        <p className="text-gray-600">
          {lang === 'zh' 
            ? '登录后可使用 AI 形象照服务，一键生成精美照片' 
            : 'Sign in to use AI portrait service and generate beautiful photos'}
        </p>
        <div className="flex gap-4 justify-center">
          <SignedOut>
            <Link
              href="/sign-in"
              className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors"
            >
              {lang === 'zh' ? '登录' : 'Sign In'}
            </Link>
            <Link
              href="/sign-up"
              className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {lang === 'zh' ? '注册' : 'Sign Up'}
            </Link>
          </SignedOut>
        </div>
        <button
          onClick={() => setShowLoginPrompt(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          {lang === 'zh' ? '取消' : 'Cancel'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Login prompt modal */}
      {showLoginPrompt && <LoginPromptModal />}

      {/* Hero Section - High converting hero with clear CTA */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20"></div>
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex justify-between items-center">
            <div className="text-3xl font-bold text-orange-900">
              {lang === 'zh' ? '银龄相馆' : 'Silver Portrait'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="text-sm text-gray-600 hover:text-orange-600"
              >
                {lang === 'zh' ? 'EN' : '中文'}
              </button>
              <SignedIn>
                {remainingQuota !== null && (
                  <Link
                    href="/quota"
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200"
                  >
                    🎫 {remainingQuota} {lang === 'zh' ? '额度' : 'quota'}
                  </Link>
                )}
                <Link
                  href="/history"
                  className="px-3 py-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
                >
                  {lang === 'zh' ? '生成记录' : 'History'}
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 text-orange-600 hover:text-orange-700 font-medium"
                >
                  {lang === 'zh' ? '登录' : 'Sign In'}
                </Link>
              </SignedOut>
            </div>
          </div>
        </div>
        
        {/* Hero Content */}
        <div className="container mx-auto px-4 py-16 text-center relative z-10">
          <div className="max-w-3xl mx-auto">
            <SignedIn>
              <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6">
                {lang === 'zh' ? '欢迎回来，' + (user?.firstName || '用户') : `Welcome back, ${user?.firstName || 'User'}`}
              </div>
            </SignedIn>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {lang === 'zh' ? (
                <>
                  一键生成<span className="text-orange-600">精美形象照</span>
                </>
              ) : (
                <>
                  Generate <span className="text-orange-600">Beautiful Portraits</span> in One Click
                </>
              )}
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              {lang === 'zh' 
                ? '上传一张照片，AI 立即为您生成专业的证件照、节日照、纪念照。无需出门，在家就能轻松拥有精美形象照。'
                : 'Upload a photo and AI will instantly generate professional ID photos, festival photos, and memorial photos. No need to go out, get beautiful portraits at home.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleStartClick}
                className="px-8 py-4 bg-orange-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-orange-700 hover:shadow-xl transition-all transform hover:scale-105"
              >
                {lang === 'zh' ? '立即开始 →' : 'Get Started →'}
              </button>
              <button className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200">
                {lang === 'zh' ? '了解更多' : 'Learn More'}
              </button>
            </div>
            
            {/* Social Proof */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full border-2 border-white"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full border-2 border-white"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full border-2 border-white"></div>
                </div>
                <span>{lang === 'zh' ? '1000+ 老人已使用' : '1000+ Seniors Used'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                <span className="text-yellow-500">★</span>
                <span className="text-yellow-500">★</span>
                <span className="text-yellow-500">★</span>
                <span className="text-yellow-500">★</span>
                <span className="ml-1">4.9/5</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-amber-200/30 rounded-full blur-3xl"></div>
      </header>

      {/* Problem Section - AIDA Framework */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              {lang === 'zh' ? '还在为拍照发愁吗？' : 'Still Worried About Taking Photos?'}
            </h2>
            <p className="text-lg text-gray-600 mb-12 leading-relaxed">
              {lang === 'zh' 
                ? '去照相馆拍照需要预约、排队、等待，天气不好还要出门。现在，只需上传一张照片，AI 就能帮您生成各种风格的精美形象照。'
                : 'Taking photos at a studio requires appointments, queuing, and waiting. Bad weather means going out. Now, just upload a photo and AI can generate beautiful portraits in various styles.'
              }
            </p>
            
            {/* Problem Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-gray-50 rounded-2xl">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {lang === 'zh' ? '不用出门' : 'No Need to Go Out'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {lang === 'zh' ? '在家就能完成，无需舟车劳顿' : 'Complete at home, no travel needed'}
                </p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {lang === 'zh' ? '快速生成' : 'Fast Generation'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {lang === 'zh' ? '几秒钟内获得精美照片' : 'Get beautiful photos in seconds'}
                </p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {lang === 'zh' ? '价格实惠' : 'Affordable Price'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {lang === 'zh' ? '比照相馆更经济、更方便' : 'More economical and convenient than studios'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section - What You Get */}
      <section id="get-started" className="py-20 bg-gradient-to-b from-orange-50 to-amber-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {lang === 'zh' ? '选择您的照片类型' : 'Choose Your Photo Type'}
            </h2>
            <p className="text-lg text-gray-600">
              {lang === 'zh' ? '多种风格，满足不同需求' : 'Various styles to meet different needs'}
            </p>
          </div>

          {/* Photo Type Cards - High Converting */}
          <div className="max-w-4xl mx-auto space-y-4">
            <button
              onClick={() => selectPhotoType('id')}
              className="w-full p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all text-left border-2 border-transparent hover:border-orange-400 group"
            >
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  📄
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {lang === 'zh' ? '证件照' : 'ID Photo'}
                  </h3>
                  <p className="text-gray-600">
                    {lang === 'zh' 
                      ? '简历、护照、签证、驾照等多种尺寸需求'
                      : 'Resume, passport, visa, driver\'s license and more sizes'}
                  </p>
                </div>
                <div className="text-orange-600 font-semibold group-hover:translate-x-2 transition-transform">
                  {lang === 'zh' ? '开始 →' : 'Start →'}
                </div>
              </div>
            </button>

            <button
              onClick={() => selectPhotoType('festival')}
              className="w-full p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all text-left border-2 border-transparent hover:border-orange-400 group"
            >
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-200 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  🎉
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {lang === 'zh' ? '节日照' : 'Festival Photo'}
                  </h3>
                  <p className="text-gray-600">
                    {lang === 'zh' 
                      ? '春节、中秋、生日等节日主题照片'
                      : 'Spring Festival, Mid-Autumn, Birthday and more'}
                  </p>
                </div>
                <div className="text-orange-600 font-semibold group-hover:translate-x-2 transition-transform">
                  {lang === 'zh' ? '开始 →' : 'Start →'}
                </div>
              </div>
            </button>

            <button
              onClick={() => selectPhotoType('memorial')}
              className="w-full p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all text-left border-2 border-transparent hover:border-orange-400 group"
            >
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-slate-200 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  🕯️
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {lang === 'zh' ? '纪念照' : 'Memorial Photo'}
                  </h3>
                  <p className="text-gray-600">
                    {lang === 'zh' 
                      ? '家庭合影、老照片修复、艺术照'
                      : 'Family photos, old photo restoration, artistic photos'}
                  </p>
                </div>
                <div className="text-orange-600 font-semibold group-hover:translate-x-2 transition-transform">
                  {lang === 'zh' ? '开始 →' : 'Start →'}
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {lang === 'zh' ? '为什么选择我们' : 'Why Choose Us'}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🚀
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {lang === 'zh' ? 'AI 智能生成' : 'AI Smart Generation'}
              </h3>
              <p className="text-gray-600 text-sm">
                {lang === 'zh' ? '先进 AI 技术，一键生成精美照片' : 'Advanced AI technology, generate photos with one click'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📱
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {lang === 'zh' ? '操作简单' : 'Easy to Use'}
              </h3>
              <p className="text-gray-600 text-sm">
                {lang === 'zh' ? '三步完成，老人也能轻松上手' : 'Three steps to complete, easy for seniors'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🔒
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {lang === 'zh' ? '隐私保护' : 'Privacy Protection'}
              </h3>
              <p className="text-gray-600 text-sm">
                {lang === 'zh' ? '您的照片安全存储，严格保密' : 'Your photos are safely stored and strictly confidential'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                💯
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {lang === 'zh' ? '品质保证' : 'Quality Guarantee'}
              </h3>
              <p className="text-gray-600 text-sm">
                {lang === 'zh' ? '不满意可重做，直到您满意' : 'Unsatisfied? We will redo until you are satisfied'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {lang === 'zh' ? '现在就尝试，立刻拥有精美照片' : 'Try Now, Get Beautiful Photos Instantly'}
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            {lang === 'zh' ? '完全免费，体验 AI 的神奇魔力' : 'Completely free, experience the magic of AI'}
          </p>
          <button
            onClick={handleStartClick}
            className="px-10 py-5 bg-white text-orange-600 text-xl font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
          >
            {lang === 'zh' ? '立即开始免费生成' : 'Start Free Generation Now'}
          </button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {lang === 'zh' ? '常见问题' : 'FAQ'}
          </h2>
          
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                {lang === 'zh' ? 'Q: 需要下载 App 吗？' : 'Q: Do I need to download an App?'}
              </h3>
              <p className="text-gray-600">
                {lang === 'zh' 
                  ? 'A: 不需要！直接通过微信或浏览器就能使用，扫码即用。'
                  : 'A: No! Just use it through WeChat or browser, scan and use.'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                {lang === 'zh' ? 'Q: 照片会保存在哪里？' : 'Q: Where are photos saved?'}
              </h3>
              <p className="text-gray-600">
                {lang === 'zh' 
                  ? 'A: 照片保存在云端，可随时下载，也可以一键分享给家人。'
                  : 'A: Photos are saved in the cloud, can be downloaded anytime or shared with family.'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                {lang === 'zh' ? 'Q: 如何确保照片质量？' : 'Q: How to ensure photo quality?'}
              </h3>
              <p className="text-gray-600">
                {lang === 'zh' 
                  ? 'A: 我们使用先进的 AI 模型，确保每张照片都清晰，专业。'
                  : 'A: We use advanced AI models to ensure every photo is clear and professional.'}
              </p>
            </div>
          </div>
        </div>
      </section>

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

      {/* Upload Step Modal */}
      {step === 'upload' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <button
              onClick={() => setStep('home')}
              className="text-gray-400 hover:text-gray-600 text-lg mb-4"
            >
              ← {t.backButton}
            </button>

            <div className="text-center space-y-4 mb-8">
              <h2 className="text-3xl font-bold">{t.uploadTitle}</h2>
              <p className="text-xl text-gray-600">{t.uploadDesc}</p>
            </div>

            <div className="border-4 border-dashed border-gray-200 rounded-2xl p-12 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
                ref={fileInputRef}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <div className="space-y-4">
                  <div className="text-6xl">📷</div>
                  <p className="text-xl text-gray-600">
                    {isUploading ? t.uploading : t.uploadButton}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Generating Step */}
      {step === 'generating' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center space-y-6">
            <div className="text-8xl animate-pulse">🎨</div>
            <h2 className="text-3xl font-bold">{t.generating}</h2>
            <p className="text-xl text-gray-600">{t.generatingDesc}</p>
            
            {uploadedImage && (
              <div className="mt-6">
                <p className="text-lg mb-2">{lang === 'zh' ? '原始照片:' : 'Original Photo:'}</p>
                <img 
                  src={uploadedImage} 
                  alt="Original" 
                  className="max-w-xs mx-auto rounded-xl shadow-lg"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result Step */}
      {step === 'result' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <button
              onClick={reset}
              className="text-orange-600 hover:underline text-lg"
            >
              ← {t.backButton}
            </button>

            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">{t.resultTitle}</h2>
            </div>

            {generatedImage && (
              <div className="space-y-6">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full rounded-2xl shadow-lg"
                />
                
                <div className="flex gap-4">
                  <a
                    href={generatedImage}
                    download={`portrait-${Date.now()}.jpg`}
                    className="flex-1 bg-orange-600 text-white text-xl font-semibold py-4 rounded-xl text-center hover:bg-orange-700 transition-colors"
                  >
                    {t.downloadButton}
                  </a>
                </div>
                
                <button
                  onClick={reset}
                  className="w-full bg-gray-100 text-gray-700 text-xl font-semibold py-4 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {t.retryButton}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
