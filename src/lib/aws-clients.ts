/**
 * AWS S3/DynamoDB クライアント
 * 画像保存とメタデータ管理用
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Readable } from 'stream';

// 環境変数
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const S3_BUCKET = process.env.S3_IMAGE_BUCKET || 'meeting-visualizer-images-dev';
const DYNAMODB_TABLE = process.env.DYNAMODB_IMAGE_TABLE || 'meeting-visualizer-images';

// S3クライアント
const s3Client = new S3Client({
  region: AWS_REGION,
});

// DynamoDBクライアント
const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// 画像メタデータの型
export interface ImageMetadata {
  userId: string;
  jobId: string;
  imageId: string;
  s3Key: string;
  title: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

/**
 * S3に画像をアップロード
 */
export async function uploadImageToS3(
  key: string,
  imageData: Buffer,
  mimeType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: imageData,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  return key;
}

/**
 * S3から画像を取得
 */
export async function getImageFromS3(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return null;
    }

    // StreamをBufferに変換
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return {
      buffer: Buffer.concat(chunks),
      mimeType: response.ContentType || 'image/png',
    };
  } catch (error) {
    console.error('S3 get error:', error);
    return null;
  }
}

/**
 * S3から画像を削除
 */
export async function deleteImageFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * DynamoDBに画像メタデータを保存
 */
export async function saveImageMetadata(metadata: ImageMetadata): Promise<void> {
  const command = new PutCommand({
    TableName: DYNAMODB_TABLE,
    Item: {
      pk: `USER#${metadata.userId}`,
      sk: `JOB#${metadata.jobId}#IMAGE#${metadata.imageId}`,
      ...metadata,
    },
  });

  await docClient.send(command);
}

/**
 * DynamoDBから特定ジョブの全画像メタデータを取得
 */
export async function getImageMetadataByJob(userId: string, jobId: string): Promise<ImageMetadata[]> {
  const command = new QueryCommand({
    TableName: DYNAMODB_TABLE,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': `JOB#${jobId}#IMAGE#`,
    },
  });

  const response = await docClient.send(command);
  return (response.Items || []) as ImageMetadata[];
}

/**
 * DynamoDBから特定画像のメタデータを取得
 */
export async function getImageMetadata(userId: string, jobId: string, imageId: string): Promise<ImageMetadata | null> {
  const command = new GetCommand({
    TableName: DYNAMODB_TABLE,
    Key: {
      pk: `USER#${userId}`,
      sk: `JOB#${jobId}#IMAGE#${imageId}`,
    },
  });

  const response = await docClient.send(command);
  return (response.Item as ImageMetadata) || null;
}

/**
 * S3キーを生成
 */
export function generateS3Key(userId: string, jobId: string, imageId: string, extension: string): string {
  return `${userId}/${jobId}/${imageId}.${extension}`;
}

/**
 * 匿名ユーザーID生成（認証なしの場合）
 */
export function getAnonymousUserId(): string {
  return 'anonymous';
}

export { S3_BUCKET, DYNAMODB_TABLE };
