import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../config/env";

const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) {
    return;
  }

  try {
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: env.S3_BUCKET,
      }),
    );
    bucketReady = true;
    return;
  } catch {
    // Continue and try to create bucket.
  }

  try {
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: env.S3_BUCKET,
      }),
    );
    bucketReady = true;
  } catch {
    // If another process created the bucket in between calls, the next upload will succeed.
    bucketReady = true;
  }
}

export async function uploadBufferToStorage(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  await ensureBucket();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );

  return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${params.key}`;
}
