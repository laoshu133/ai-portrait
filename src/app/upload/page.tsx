'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zh, en } from '@/i18n/translations';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ID_PHOTO_SPECS } from '@/lib/id-photo';

type PhotoType = 'id' | 'festival' | 'memorial';

// Standard ID photo purposes and dimensions (width:height ratio)
interface IdPhotoOption {
  key: string;
  nameZh: string;
  nameEn: string;
  aspectRatio: string;
  sizeId: string;
  width: number;
  height: number;
}

const ID_PHOTO_PURPOSES: IdPhotoOption[] = Object.entries(ID_PHOTO_SPECS).map(([key, spec]) => ({
  key,
  nameZh: spec.labelZh,
  nameEn: spec.labelEn,
  aspectRatio: spec.aspectRatio,
  sizeId: spec.sizeId,
  width: spec.width,
  height: spec.height,
}));

// Background color options
const BACKGROUND_COLORS = [
  { key: 'blue', nameZh: '蓝色', nameEn: 'Blue', value: '蓝色' },
  { key: 'white', nameZh: '白色', nameEn: 'White', value: '白色' },
  { key: 'red', nameZh: '红色', nameEn: 'Red', value: '红色' },
  { key: 'gray', nameZh: '灰色', nameEn: 'Gray', value: '灰色' },
];

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, user } = useUser();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [photoType, setPhotoType] = useState<PhotoType>('id');
  const [regenerateId, setRegenerateId] = useState<string | null>(null);
  const [effectivePhotoType, setEffectivePhotoType] = useState<PhotoType>('id');

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

  // 语言变化时更新页面标题
  useEffect(() => {
    document.title = lang === 'zh' 
      ? '上传照片 - 银龄相馆' 
      : 'Upload Photo - Silver Portrait Studio';
  }, [lang]);

  // 切换语言并保存到localStorage
  const toggleLang = () => {
    const newLang = lang === 'zh' ? 'en' : 'zh';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  // ID photo custom parameters
  const [selectedPurpose, setSelectedPurpose] = useState<string>('common');
  const [backgroundColor, setBackgroundColor] = useState<string>('blue');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = lang === 'zh' ? zh : en;

  // Get URL params on client side only
  useEffect(() => {
    try {
      const typeParam = searchParams.get('type') as PhotoType;
      const regenerate = searchParams.get('regenerate');
      setRegenerateId(regenerate);
      
      if (typeParam && ['id', 'festival', 'memorial'].includes(typeParam)) {
        setEffectivePhotoType(typeParam);
        setPhotoType(typeParam);
      } else {
        setEffectivePhotoType(photoType);
      }
    } catch (err) {
      console.error('Error parsing URL params:', err);
      setEffectivePhotoType('id');
    }
  }, [searchParams]);

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

  // Compress image before upload - safe for any environment
  const compressImage = useCallback(async (file: File): Promise<File> => {
    // Only run compression on client side
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return file;
    }

    return new Promise((resolve, reject) => {
      try {
        const img = new (window as any).Image();
        img.onload = () => {
          try {
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
              0.85
            );
          } catch (err) {
            console.error('Error during compression:', err);
            reject(err);
          }
        };
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        img.src = URL.createObjectURL(file);
      } catch (err) {
        console.error('Error creating image:', err);
        reject(err);
      }
    });
  }, []);

  // 调试日志状态
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // 添加调试日志
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev, logMessage]);
  }, []);

  const generateImage = useCallback(async (file: File) => {
    setIsGenerating(true);
    setError(null);
    
    // 清空之前的调试日志
    setDebugLogs([]);
    
    try {
      // 1. 点击生成按钮时的参数、上传的文件信息
      addDebugLog('========== 开始生成证件照 ==========');
      addDebugLog('1. 点击生成按钮时的参数和文件信息:');
      addDebugLog(`   - 文件名: ${file.name}`);
      addDebugLog(`   - 文件大小: ${(file.size / 1024).toFixed(2)} KB`);
      addDebugLog(`   - 文件类型: ${file.type}`);
      addDebugLog(`   - 照片类型: ${effectivePhotoType}`);
      addDebugLog(`   - 语言: ${lang}`);
      if (effectivePhotoType === 'id') {
        addDebugLog(`   - 证件照用途: ${selectedPurpose}`);
        addDebugLog(`   - 背景颜色: ${backgroundColor}`);
      }

      // 2. FormData构造的完整过程，所有append的字段和值
      addDebugLog('2. 构造FormData:');
      const formData = new FormData();
      
      addDebugLog('   - append: image, 值: [File对象]');
      formData.append('image', file);
      
      addDebugLog(`   - append: type, 值: ${effectivePhotoType}`);
      formData.append('type', effectivePhotoType);
      
      addDebugLog(`   - append: lang, 值: ${lang}`);
      formData.append('lang', lang);
      
      // Add ID photo custom parameters
      if (effectivePhotoType === 'id') {
        addDebugLog(`   - append: purpose, 值: ${selectedPurpose}`);
        formData.append('purpose', selectedPurpose);
        
        addDebugLog(`   - append: background, 值: ${backgroundColor}`);
        formData.append('background', backgroundColor);
      }

      // 3. 发送请求的完整目标地址、请求头
      addDebugLog('3. 准备发送请求:');
      const requestUrl = '/api/generate';
      addDebugLog(`   - 目标地址: ${requestUrl}`);
      addDebugLog('   - 请求方法: POST');
      addDebugLog('   - 请求头:');
      addDebugLog('     Content-Type: multipart/form-data (由浏览器自动设置)');

      // Set timeout: 3 minutes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      addDebugLog('4. 发送请求...');
      const response = await fetch(requestUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 4. 完整的请求响应内容
      addDebugLog('5. 收到响应:');
      addDebugLog(`   - 响应状态: ${response.status} ${response.statusText}`);
      addDebugLog('   - 响应头:');
      response.headers.forEach((value, key) => {
        addDebugLog(`     ${key}: ${value}`);
      });

      let data;
      const contentType = response.headers.get('content-type');
      addDebugLog(`   - Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        addDebugLog('   - 响应内容 (JSON):');
        addDebugLog(`     ${JSON.stringify(data, null, 2).replace(/\n/g, '\n     ')}`);
      } else {
        const text = await response.text();
        addDebugLog('   - 响应内容 (文本):');
        addDebugLog(`     ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
        throw new Error(`Server error: ${response.status} - ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        addDebugLog(`   - 请求失败: ${response.status}`);
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

      if (data.recordId) {
        addDebugLog('6. 任务创建成功，进入异步轮询');
        addDebugLog(`   - 记录ID: ${data.recordId}`);
        setActiveRecordId(data.recordId);
        router.push(`/history/${data.recordId}`);
        return;
      }

      if (data.imageUrl && data.recordId) {
        addDebugLog('6. 生成成功!');
        addDebugLog(`   - 图片URL: ${data.imageUrl}`);
        addDebugLog(`   - 记录ID: ${data.recordId}`);
        if (data.remainingQuota !== undefined) {
          addDebugLog(`   - 剩余额度: ${data.remainingQuota}`);
        }
        addDebugLog('========== 生成完成 ==========');
        
        // Redirect to detail page after successful generation
        router.push(`/history/${data.recordId}`);
        if (data.remainingQuota !== undefined) {
          setRemainingQuota(data.remainingQuota);
        }
      } else {
        addDebugLog('   - 错误: 没有返回图片');
        throw new Error(data.error || 'No image returned');
      }
    } catch (err: any) {
      addDebugLog('========== 生成出错 ==========');
      addDebugLog(`错误类型: ${err.name || 'Unknown'}`);
      addDebugLog(`错误消息: ${err.message}`);
      if (err.stack) {
        addDebugLog(`堆栈跟踪: ${err.stack}`);
      }
      console.error('Generation error:', err);
      
      if (err.name === 'AbortError') {
        setError(lang === 'zh' ? '生成超时，请重试' : 'Generation timed out, please try again');
      } else {
        setError(err.message || 'Generation failed');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [effectivePhotoType, lang, selectedPurpose, backgroundColor, router, addDebugLog]);

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
  }, [regenerateId, generateImage]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (typeof URL !== 'undefined') {
        const previewUrl = URL.createObjectURL(file);
        setUploadedImage(previewUrl);
        await generateImage(file);
      } else {
        setError('Compression failed, please try again');
      }
    } finally {
      setIsUploading(false);
    }
  }, [compressImage, generateImage]);

  const reset = useCallback(() => {
    setUploadedImage(null);
    setGeneratedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const changePhotoType = useCallback((type: PhotoType) => {
    setPhotoType(type);
    reset();
    router.push(`/upload?type=${type}`);
  }, [reset, router]);

  // Redirect if not signed in
  useEffect(() => {
    if (!isSignedIn) {
      router.push('/sign-in');
    }
  }, [isSignedIn, router]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <p>{lang === 'zh' ? '正在跳转...' : 'Redirecting...'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header - Full Navigation */}
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
                onClick={toggleLang}
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

        {/* Upload Area */}
        {!uploadedImage && !isUploading && !isGenerating && !error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-center mb-6">
                {lang === 'zh' ? '上传您的照片' : 'Upload Your Photo'}
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
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
                    <div className="text-5xl">📷</div>
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

        {/* ID Photo Custom Parameters */}
        {effectivePhotoType === 'id' && !uploadedImage && !isUploading && !isGenerating && !error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {lang === 'zh' ? '证件照参数设置' : 'ID Photo Settings'}
              </h2>
              
              {/* Purpose Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {lang === 'zh' ? '用途 / 尺寸' : 'Purpose / Size'}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ID_PHOTO_PURPOSES.map(purpose => (
                    <button
                      key={purpose.key}
                      onClick={() => setSelectedPurpose(purpose.key)}
                      className={`p-3 rounded-lg text-sm transition-all ${
                        selectedPurpose === purpose.key
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 border border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {lang === 'zh' ? purpose.nameZh : purpose.nameEn}
                      <div className="mt-1 text-xs text-gray-500">
                        {purpose.sizeId} · {purpose.width}×{purpose.height} · {purpose.aspectRatio}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Background Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {lang === 'zh' ? '背景颜色' : 'Background Color'}
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {BACKGROUND_COLORS.map(color => (
                    <button
                      key={color.key}
                      onClick={() => setBackgroundColor(color.key)}
                      className={`p-3 rounded-lg text-sm transition-all ${
                        backgroundColor === color.key
                          ? 'border-2'
                          : 'bg-gray-50 border border-gray-200 hover:border-orange-300'
                      }`}
                      style={backgroundColor === color.key ? {
                        borderColor: color.key === 'white' ? '#666' : color.key,
                        backgroundColor: color.key + '33',
                      } : {}}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: color.key }}
                        ></div>
                        {lang === 'zh' ? color.nameZh : color.nameEn}
                      </div>
                    </button>
                  ))}
                </div>
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

      {/* 调试面板切换按钮 */}
      <button
        onClick={() => setShowDebugPanel(!showDebugPanel)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 text-sm z-40"
      >
        {showDebugPanel ? '隐藏调试' : '显示调试'}
      </button>

      {/* 调试面板 */}
      {showDebugPanel && (
        <div className="fixed bottom-20 right-4 w-96 max-h-96 bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden z-50">
          <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
            <h3 className="font-semibold text-sm">🔍 调试日志</h3>
            <button
              onClick={() => setDebugLogs([])}
              className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
            >
              清空
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-80 font-mono text-xs">
            {debugLogs.length === 0 ? (
              <p className="text-gray-500">暂无日志，开始生成照片后会显示调试信息...</p>
            ) : (
              <div className="space-y-1">
                {debugLogs.map((log, index) => (
                  <div key={index} className="break-all">
                    {log}
                  </div>
                ))}
              </div>
            )}
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
  // Use completely static fallback to avoid ANY server-side issues
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="银龄相馆" className="w-8 h-8" />
                <div className="text-2xl font-bold text-orange-900">
                  银龄相馆
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl animate-pulse mb-6">⌛</div>
            <p className="text-xl text-gray-600">加载中...</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-6 bg-gray-900 text-gray-400 text-center">
          <p>© 2026 银龄相馆</p>
          <div className="mt-2 space-x-4">
            <span>隐私政策</span>
            <span>服务条款</span>
          </div>
        </footer>
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
