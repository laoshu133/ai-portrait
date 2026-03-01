/**
 * User Generation Quota Management
 * Handles:
 * - Get user's remaining quota
 * - Initialize new user with free quota (1 free generation)
 * - Deduct quota after successful generation
 * - Add quota after successful purchase
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET!;

export interface UserQuota {
  userId: string;
  remainingQuota: number;
  totalPurchased: number;
  totalGenerated: number;
  lastUpdated: number;
}

// Get quota object path for user
function getQuotaKey(userId: string): string {
  return `quotas/${userId}.json`;
}

// Initialize a new user with 1 free generation
export async function initializeUserQuota(userId: string): Promise<UserQuota> {
  const initialQuota: UserQuota = {
    userId,
    remainingQuota: 1, // 1 free generation for new users
    totalPurchased: 0,
    totalGenerated: 0,
    lastUpdated: Date.now(),
  };

  await saveUserQuota(initialQuota);
  return initialQuota;
}

// Get user quota, initialize if not exists
export async function getUserQuota(userId: string): Promise<UserQuota> {
  const key = getQuotaKey(userId);
  
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    
    const response = await r2Client.send(command);
    const body = await response.Body?.transformToString();
    
    if (!body) {
      return initializeUserQuota(userId);
    }
    
    return JSON.parse(body) as UserQuota;
  } catch (error: any) {
    // If file doesn't exist, initialize
    if (error.name === 'NoSuchKey') {
      return initializeUserQuota(userId);
    }
    throw error;
  }
}

// Save user quota to R2
export async function saveUserQuota(quota: UserQuota): Promise<void> {
  const key = getQuotaKey(quota.userId);
  const body = JSON.stringify({ ...quota, lastUpdated: Date.now() }, null, 2);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: 'application/json',
  });
  
  await r2Client.send(command);
}

// Deduct 1 quota after successful generation
export async function deductQuota(userId: string): Promise<{ success: boolean; remaining: number }> {
  const quota = await getUserQuota(userId);
  
  if (quota.remainingQuota <= 0) {
    return { success: false, remaining: 0 };
  }
  
  quota.remainingQuota -= 1;
  quota.totalGenerated += 1;
  await saveUserQuota(quota);
  
  return { success: true, remaining: quota.remainingQuota };
}

// Add quota after successful purchase
export async function addQuota(userId: string, amount: number): Promise<number> {
  const quota = await getUserQuota(userId);
  
  quota.remainingQuota += amount;
  quota.totalPurchased += amount;
  await saveUserQuota(quota);
  
  return quota.remainingQuota;
}

// Check if user has enough quota
export async function hasEnoughQuota(userId: string): Promise<boolean> {
  const quota = await getUserQuota(userId);
  return quota.remainingQuota > 0;
}
