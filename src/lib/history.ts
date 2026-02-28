import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

export interface GenerationRecord {
  id: string;
  timestamp: number;
  type: 'id' | 'festival' | 'memorial';
  originalUrl: string;
  generatedUrl: string;
  lang: string;
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
    // 如果文件不存在，返回空数组
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
  
  const newRecord: GenerationRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: Date.now(),
  };
  
  history.unshift(newRecord);
  await saveUserHistory(userId, history);
  
  return newRecord;
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
