import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

export type GenerationStatus = 'queued' | 'processing' | 'success' | 'failed';

export interface GenerationRecord {
  id: string;
  timestamp: number;
  type: 'id' | 'festival' | 'memorial';
  originalUrl: string;
  generatedUrl: string | null;
  status: GenerationStatus;
  error?: string;
  lang: string;
  purpose?: string;
  background?: string;
  taskId?: string;
  outputMimeType?: string;
  outputExtension?: string;
  outputWidth?: number;
  outputHeight?: number;
}

export async function getUserHistory(userId: string): Promise<GenerationRecord[]> {
  const key = `history/${userId}.json`;
  
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });
    
    const response = await r2Client.send(command);
    
    if (!response.Body) {
      return [];
    }
    
    const body = await response.Body.transformToString();
    const data = JSON.parse(body);
    return data.records || [];
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return [];
    }
    throw error;
  }
}

export async function saveUserHistory(userId: string, records: GenerationRecord[]): Promise<void> {
  const key = `history/${userId}.json`;
  
  const body = JSON.stringify({ records }, null, 2);
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: 'application/json',
  });
  
  await r2Client.send(command);
}

export async function addGenerationRecord(
  userId: string,
  record: Omit<GenerationRecord, 'id' | 'timestamp'>
): Promise<GenerationRecord> {
  const history = await getUserHistory(userId);
  
  const now = Date.now();
  const newRecord: GenerationRecord = {
    ...record,
    id: `${now}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: now,
  };
  
  history.unshift(newRecord);
  await saveUserHistory(userId, history);
  
  return newRecord;
}

export async function updateGenerationRecord(
  userId: string,
  recordId: string,
  updates: Partial<GenerationRecord>
): Promise<boolean> {
  const history = await getUserHistory(userId);
  const index = history.findIndex(r => r.id === recordId);
  
  if (index === -1) {
    return false;
  }
  
  history[index] = { ...history[index], ...updates };
  await saveUserHistory(userId, history);
  return true;
}

export async function deleteGenerationRecord(
  userId: string,
  recordId: string
): Promise<boolean> {
  const history = await getUserHistory(userId);
  const filtered = history.filter(r => r.id !== recordId);
  
  if (filtered.length === history.length) {
    return false;
  }
  
  await saveUserHistory(userId, filtered);
  return true;
}

export async function getGenerationRecord(
  userId: string,
  recordId: string
): Promise<GenerationRecord | null> {
  const history = await getUserHistory(userId);
  return history.find(r => r.id === recordId) || null;
}
