'use client';

import { useState } from 'react';
import { zh, en } from '@/i18n/translations';

type PhotoType = 'id' | 'festival' | 'memorial';
type Step = 'home' | 'upload' | 'generating' | 'result';

export default function Home() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [step, setStep] = useState<Step>('home');
  const [photoType, setPhotoType] = useState<PhotoType | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const t = lang === 'zh' ? zh : en;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    setPhotoType(type);
    setStep('upload');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-800">{t.welcome}</div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{t.language}:</span>
          <button
            onClick={() => setLang('zh')}
            className={`px-3 py-1 rounded ${lang === 'zh' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            中文
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            EN
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Home Step */}
        {step === 'home' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-gray-800">{t.welcome}</h1>
              <p className="text-2xl text-blue-600">{t.subtitle}</p>
              <p className="text-lg text-gray-600">{t.description}</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-center text-gray-700">
                {t.photoTypes}
              </h2>
              
              <button
                onClick={() => selectPhotoType('id')}
                className="w-full p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left border-2 border-transparent hover:border-blue-400"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">📄</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{t.idPhoto}</h3>
                    <p className="text-gray-600">{t.idPhotoDesc}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => selectPhotoType('festival')}
                className="w-full p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left border-2 border-transparent hover:border-orange-400"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{t.festivalPhoto}</h3>
                    <p className="text-gray-600">{t.festivalPhotoDesc}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => selectPhotoType('memorial')}
                className="w-full p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left border-2 border-transparent hover:border-gray-400"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🕯️</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{t.memorialPhoto}</h3>
                    <p className="text-gray-600">{t.memorialPhotoDesc}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-8">
            <button
              onClick={() => setStep('home')}
              className="text-blue-600 hover:underline text-lg"
            >
              ← {t.backButton}
            </button>

            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">{t.uploadTitle}</h2>
              <p className="text-xl text-gray-600">{t.uploadDesc}</p>
            </div>

            <div className="border-4 border-dashed border-gray-300 rounded-2xl p-12 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
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
        )}

        {/* Generating Step */}
        {step === 'generating' && (
          <div className="space-y-8 text-center py-12">
            <div className="text-8xl animate-pulse">🎨</div>
            <h2 className="text-3xl font-bold">{t.generating}</h2>
            <p className="text-xl text-gray-600">{t.generatingDesc}</p>
            
            {uploadedImage && (
              <div className="mt-8">
                <p className="text-lg mb-2">原始照片:</p>
                <img 
                  src={uploadedImage} 
                  alt="Original" 
                  className="max-w-xs mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && (
          <div className="space-y-8">
            <button
              onClick={reset}
              className="text-blue-600 hover:underline text-lg"
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
                    className="flex-1 bg-blue-600 text-white text-xl font-semibold py-4 rounded-xl text-center hover:bg-blue-700 transition-colors"
                  >
                    {t.downloadButton}
                  </a>
                </div>
                
                <button
                  onClick={reset}
                  className="w-full bg-gray-200 text-gray-700 text-xl font-semibold py-4 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  {t.retryButton}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500">
        <p>© 2026 {t.welcome}</p>
      </footer>
    </div>
  );
}
