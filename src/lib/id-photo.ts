export type PhotoType = 'id' | 'festival' | 'memorial';

export interface IdPhotoRenderSpec {
  sizeId: string;
  width: number;
  height: number;
  aspectRatio: string;
  labelZh: string;
  labelEn: string;
}

export const ID_PHOTO_SPECS: Record<string, IdPhotoRenderSpec> = {
  common: {
    sizeId: '1inch',
    width: 413,
    height: 579,
    aspectRatio: '413:579',
    labelZh: '通用一寸',
    labelEn: 'Common 1 inch',
  },
  common2: {
    sizeId: '2inch',
    width: 413,
    height: 626,
    aspectRatio: '413:626',
    labelZh: '通用二寸',
    labelEn: 'Common 2 inch',
  },
  passport: {
    sizeId: 'passport',
    width: 413,
    height: 531,
    aspectRatio: '413:531',
    labelZh: '护照/签证',
    labelEn: 'Passport/Visa',
  },
  idcard: {
    sizeId: 'idcard',
    width: 358,
    height: 441,
    aspectRatio: '358:441',
    labelZh: '中国大陆身份证',
    labelEn: 'Chinese ID Card',
  },
  driver: {
    sizeId: 'driver',
    width: 294,
    height: 413,
    aspectRatio: '294:413',
    labelZh: '驾驶证',
    labelEn: 'Driver License',
  },
  social: {
    sizeId: 'social',
    width: 358,
    height: 441,
    aspectRatio: '358:441',
    labelZh: '社保照片',
    labelEn: 'Social Security',
  },
  cv: {
    sizeId: 'cv',
    width: 600,
    height: 900,
    aspectRatio: '2:3',
    labelZh: '简历照片',
    labelEn: 'Resume Photo',
  },
};

export function getIdPhotoSpec(purpose?: string): IdPhotoRenderSpec {
  return ID_PHOTO_SPECS[purpose || 'common'] || ID_PHOTO_SPECS.common;
}

export function getImageExtensionFromMimeType(mimeType?: string | null): string {
  if (!mimeType) return 'png';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  return 'png';
}
