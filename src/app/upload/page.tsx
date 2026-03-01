'use client';

import { useState, useRef, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zh, en } from '@/i18n/translations';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

type PhotoType = 'id' | 'festival' | 'memorial';

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, user } = useUser();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [photoType, setPhotoType] = useState<PhotoType>('id');

  // Get photo type from URL
  const typeParam = searchParams.get('type') as PhotoType;
  const regenerateId = searchParams.get('regenerate');
  const effectivePhotoType = typeParam && ['id', 'festival', 'memorial'].includes(typeParam) ? typeParam : photoType;

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = lang === 'zh' ? zh : en;

  // Fetch remaining quota on mount
  useEffect(() => {
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
  }, []);

  // Redirect if not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <p>{lang === 'zh' ? '正在跳转...' : 'Redirecting...'}</p>
      </div>
    );
  }

  // Auto load for regenerate
  useEffect(() => {
    if (!regenerateId) return;

    async function loadForRegenerate() {
      setIsUploading(true);
      try {
        const res = await fetch(`/api/history/${regenerateId}`);
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || '加载记录失败');
        }
        const record = data.record;
        setUploadedImage(record.originalUrl);
        // Convert data URL to File object
        const response = await fetch(record.originalUrl);
        const blob = await response.blob();
        const file = new File([blob], `original-${record.id}.jpg`, { type: blob.type });
        // Start generation
        await generateImage(file);
      } catch (err: any) {
        console.error('Regenerate load error:', err);
        setError(err.message);
      } finally {
        setIsUploading(false);
      }
    }

    loadForRegenerate();
  }, [regenerateId]);

  // Compress image before upload, max long edge 1920px
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Resize if long edge exceeds 1920px
        if (width > height && width > 1920) {
          height = Math.round((height * 1920) / width);
          width = 1920;
        } else if (height > width && height > 1920) {
          width = Math.round((width * 1920) / height);
          height = 1920;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
            resolve(compressedFile);
          },
          'image/jpeg',
          0.85 // Quality
        );
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    
    try {
      // Compress image before upload
      const compressedFile = await compressImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedFile);
      setUploadedImage(previewUrl);
      
      // Start generation
      await generateImage(compressedFile);
    } catch (err) {
      console.error('Compression error:', err);
      // Fallback to original file if compression fails
      const previewUrl = URL.createObjectURL(file);
      setUploadedImage(previewUrl);
      await generateImage(file);
    } finally {
      setIsUploading(false);
    }
  };

  const generateImage = async (file: File) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', effectivePhotoType);
      formData.append('lang', lang);

      // Set timeout: 3 minutes (180 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/sign-in');
          return;
        }
        if (response.status === 402 && data.error === 'INSUFFICIENT_QUOTA') {
          setShowQuotaModal(true);
          return;
        }
        throw new Error(data.error || `Generation failed: ${response.status}`);
      }

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        // Update remaining quota after successful generation
        if (data.remainingQuota !== undefined) {
          setRemainingQuota(data.remainingQuota);
        }
      } else {
        throw new Error(data.error || 'No image returned');
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      if (err.name === 'AbortError') {
        setError(lang === 'zh' ? '生成超时，请重试' : 'Generation timed out, please try again');
      } else {
        setError(err.message || 'Generation failed');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setUploadedImage(null);
    setGeneratedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const changePhotoType = (type: PhotoType) => {
    setPhotoType(type);
    reset();
    router.push(`/upload?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header - Full Navigation */}
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
              {remainingQuota !== null && (
                <Link
                  href="/quota"
                  className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200 flex items-center gap-1"
                  title={lang === 'zh' ? `剩余 ${remainingQuota} 次额度` : `${remainingQuota} quota remaining`}
                >
                  🎫 {remainingQuota}
                </Link>
              )}
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
        {/* Photo Type Selection */}
        <div className="max-w-2xl mx-auto mb-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            {lang === 'zh' ? '选择照片类型' : 'Choose Photo Type'}
          </h1>
          
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => changePhotoType('id')}
              className={`p-4 rounded-xl text-center transition-all ${
                effectivePhotoType === 'id' 
                  ? 'bg-orange-100 border-2 border-orange-500' 
                  : 'bg-white border border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="font-medium">{lang === 'zh' ? '证件照' : 'ID Photo'}</div>
            </button>
            <button
              onClick={() => changePhotoType('festival')}
              className={`p-4 rounded-xl text-center transition-all ${
                effectivePhotoType === 'festival' 
                  ? 'bg-orange-100 border-2 border-orange-500' 
                  : 'bg-white border border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-medium">{lang === 'zh' ? '节日照' : 'Festival'}</div>
            </button>
            <button
              onClick={() => changePhotoType('memorial')}
              className={`p-4 rounded-xl text-center transition-all ${
                effectivePhotoType === 'memorial' 
                  ? 'bg-orange-100 border-2 border-orange-500' 
                  : 'bg-white border border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className="text-3xl mb-2">🕯️</div>
              <div className="font-medium">{lang === 'zh' ? '纪念照' : 'Memorial'}</div>
            </button>
          </div>
        </div>

        {/* Upload Area - 只有没有图片且不在生成中时显示 */}
        {!uploadedImage && !isUploading && !isGenerating && !error && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-xl font-semibold text-center mb-6">
                {lang === 'zh' ? '上传您的照片' : 'Upload Your Photo'}
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  ref={fileInputRef}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="space-y-4">
                    <div className="text-6xl">📷</div>
                    <p className="text-gray-600">
                      {lang === 'zh' ? '点击选择图片' : 'Click to select image'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {lang === 'zh' ? '支持 JPG、PNG 格式，最大 4MB' : 'Supports JPG, PNG, max 4MB'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Generating */}
        {(isUploading || isGenerating) && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="text-8xl animate-pulse mb-6">🎨</div>
              <h2 className="text-2xl font-bold mb-4">
                {lang === 'zh' ? '正在生成...' : 'Generating...'}
              </h2>
              <div className="text-gray-600 space-y-3">
                <p>
                  {lang === 'zh' ? 'AI 正在处理您的照片，这大约需要 30-60 秒' : 'AI is processing your photo, this takes about 30-60 seconds'}
                </p>
                <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-xl">
                  {lang === 'zh' 
                    ? '🔔 您可以关闭此页面，处理完成后结果会自动保存到「生成记录」，稍后前往查看即可' 
                    : '🔔 You can close this page. The result will be automatically saved to "Generation History", check it later'}
                </p>
              </div>
              {uploadedImage && (
                <div className="mt-6">
                  <p className="text-sm text-gray-500 mb-2">
                    {lang === 'zh' ? '原始照片:' : 'Original:'}
                  </p>
                  <div className="max-w-xs mx-auto">
                    <img 
                      src={uploadedImage} 
                      alt="Original" 
                      className="w-full rounded-lg shadow object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">😢</div>
              <h2 className="text-xl font-bold text-red-600 mb-4">
                {lang === 'zh' ? '生成失败' : 'Generation Failed'}
              </h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="flex gap-4">
                <button
                  onClick={reset}
                  className="flex-1 px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700"
                >
                  {lang === 'zh' ? '重新尝试' : 'Try Again'}
                </button>
                <Link
                  href="/"
                  className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                >
                  {lang === 'zh' ? '返回首页' : 'Back Home'}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {generatedImage && !isGenerating && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-center mb-6">
                {lang === 'zh' ? '生成完成！' : 'Generation Complete!'}
              </h2>
              
              <div className="w-full">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full rounded-xl shadow-lg mb-6 object-contain"
                />
              </div>
                
              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <a
                    href={generatedImage}
                    download={`portrait-${Date.now()}.jpg`}
                    className="flex-1 bg-orange-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-orange-700"
                  >
                    {lang === 'zh' ? '下载照片' : 'Download'}
                  </a>
                  <button
                    onClick={reset}
                    className="flex-1 bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-200"
                  >
                    {lang === 'zh' ? '重新生成' : 'Generate Another'}
                  </button>
                </div>
                <Link
                  href="/"
                  className="w-full bg-white border border-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-50"
                >
                  {lang === 'zh' ? '返回首页' : 'Back to Home'}
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Insufficient Quota Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
            <div className="text-6xl">🎫</div>
            <h2 className="text-2xl font-bold">
              {lang === 'zh' ? '额度不足' : 'Insufficient Quota'}
            </h2>
            <p className="text-gray-600">
              {lang === 'zh' 
                ? '您当前没有可用的生成额度，请购买额度包后继续生成。'
                : 'You don\'t have any remaining generation quota. Please purchase a quota pack to continue.'}
            </p>
            <div className="space-y-3">
              <Link
                href="/quota"
                className="block w-full px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors"
              >
                {lang === 'zh' ? '购买额度' : 'Buy Quota'}
              </Link>
              <button
                onClick={() => setShowQuotaModal(false)}
                className="block w-full px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

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

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
