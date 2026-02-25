export const zh = {
  // 首页
  welcome: '银龄相馆',
  subtitle: '留住最美的样子',
  description: '为老年人打造的 AI 形象照应用',
  
  // 语言
  language: '语言',
  chinese: '中文',
  english: 'English',
  
  // 照片类型
  photoTypes: '选择照片类型',
  idPhoto: '证件照',
  idPhotoDesc: '蓝底、白底、红底，适合各类证件使用',
  festivalPhoto: '节日祝福照',
  festivalPhotoDesc: '春节、中秋、生日等节日主题照片',
  memorialPhoto: '遗像',
  memorialPhotoDesc: '高清遗像修复与生成',
  
  // 上传流程
  uploadTitle: '上传照片',
  uploadDesc: '请上传一张清晰的照片',
  uploadButton: '选择照片',
  takePhoto: '拍照',
  fromAlbum: '从相册选择',
  uploading: '上传中...',
  
  // 生成
  generating: 'AI 正在生成中...',
  generatingDesc: '请稍候，预计需要 30-60 秒',
  generateButton: '开始生成',
  
  // 结果
  resultTitle: '生成完成',
  downloadButton: '下载照片',
  retryButton: '重新生成',
  backButton: '返回',
  
  // 错误
  error: '出错了',
  errorUpload: '上传失败，请重试',
  errorGenerate: '生成失败，请重试',
  
  // 定价
  pricing: '价格套餐',
  free: '免费体验',
  basic: '基础版',
  pro: '专业版',
  premium: '遗像专线',
  
  // 通用
  next: '下一步',
  prev: '上一步',
  confirm: '确认',
  cancel: '取消',
  loading: '加载中...',
};

export const en = {
  // Home
  welcome: 'Silver Portrait Studio',
  subtitle: 'Preserve Your Beautiful Moments',
  description: 'AI portrait app designed for seniors',
  
  // Language
  language: 'Language',
  chinese: '中文',
  english: 'English',
  
  // Photo Types
  photoTypes: 'Choose Photo Type',
  idPhoto: 'ID Photo',
  idPhotoDesc: 'Blue, white, or red background for official use',
  festivalPhoto: 'Festival Photo',
  festivalPhotoDesc: 'Chinese New Year, Mid-Autumn, Birthday themes',
  memorialPhoto: 'Memorial Photo',
  memorialPhotoDesc: 'High-quality memorial portrait restoration',
  
  // Upload
  uploadTitle: 'Upload Photo',
  uploadDesc: 'Please upload a clear photo',
  uploadButton: 'Choose Photo',
  takePhoto: 'Take Photo',
  fromAlbum: 'From Album',
  uploading: 'Uploading...',
  
  // Generate
  generating: 'AI is generating...',
  generatingDesc: 'Please wait, it takes about 30-60 seconds',
  generateButton: 'Start Generation',
  
  // Result
  resultTitle: 'Generation Complete',
  downloadButton: 'Download Photo',
  retryButton: 'Regenerate',
  backButton: 'Back',
  
  // Error
  error: 'Error',
  errorUpload: 'Upload failed, please try again',
  errorGenerate: 'Generation failed, please try again',
  
  // Pricing
  pricing: 'Pricing',
  free: 'Free Trial',
  basic: 'Basic',
  pro: 'Pro',
  premium: 'Memorial',
  
  // Common
  next: 'Next',
  prev: 'Previous',
  confirm: 'Confirm',
  cancel: 'Cancel',
  loading: 'Loading...',
};

export type TranslationKey = keyof typeof zh;
