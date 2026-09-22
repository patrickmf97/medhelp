import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

interface MediaRule {
  extension: string;
  maxBytes: number;
}

const MEDIA_RULES: Readonly<Record<string, MediaRule>> = {
  'application/pdf': { extension: 'pdf', maxBytes: 25 * 1024 * 1024 },
  'image/jpeg': { extension: 'jpg', maxBytes: 10 * 1024 * 1024 },
  'image/png': { extension: 'png', maxBytes: 10 * 1024 * 1024 },
  'image/webp': { extension: 'webp', maxBytes: 10 * 1024 * 1024 },
  'video/mp4': { extension: 'mp4', maxBytes: 500 * 1024 * 1024 },
  'video/webm': { extension: 'webm', maxBytes: 500 * 1024 * 1024 },
};

export interface MediaUploadInput {
  actorId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface PreparedMediaUpload {
  objectKey: string;
  mimeType: string;
  size: number;
  maxAgeSeconds: number;
}

export interface R2UploadConfiguration {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

interface UploadReceiptPayload {
  objectKey: string;
  mimeType: string;
  size: number;
  expiresAt: string;
}

export function prepareMediaUpload(input: MediaUploadInput): PreparedMediaUpload {
  if (!Number.isSafeInteger(input.size) || input.size <= 0) {
    throw new Error('File cannot be empty');
  }

  const rule = MEDIA_RULES[input.mimeType];
  if (!rule) {
    throw new Error('Unsupported media type');
  }

  if (input.size > rule.maxBytes) {
    throw new Error(`File exceeds the ${Math.floor(rule.maxBytes / 1024 / 1024)} MB limit`);
  }

  if (
    input.fileName.includes('/') ||
    input.fileName.includes('\\') ||
    input.fileName.includes('..')
  ) {
    throw new Error('Unsafe file name');
  }

  const baseName = input.fileName.replace(/\.[^.]+$/, '');
  const safeName = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  if (!safeName) {
    throw new Error('Unsafe file name');
  }

  const safeActorId = input.actorId.replace(/[^a-zA-Z0-9-]/g, '');
  if (!safeActorId) {
    throw new Error('Invalid actor');
  }

  return {
    objectKey: `content/${safeActorId}/${randomUUID()}-${safeName}.${rule.extension}`,
    mimeType: input.mimeType,
    size: input.size,
    maxAgeSeconds: 900,
  };
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function signR2Upload(
  upload: PreparedMediaUpload,
  configuration: R2UploadConfiguration,
  now = new Date(),
): { uploadUrl: string; objectKey: string; expiresAt: string } {
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = date.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const host = `${configuration.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encode(configuration.bucketName)}/${upload.objectKey
    .split('/')
    .map(encode)
    .join('/')}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'X-Amz-Credential': `${configuration.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': date,
    'X-Amz-Expires': String(upload.maxAgeSeconds),
    'X-Amz-SignedHeaders': 'content-length;content-type;host',
  });
  query.sort();

  const canonicalHeaders = `content-length:${upload.size}\ncontent-type:${upload.mimeType}\nhost:${host}\n`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    query.toString(),
    canonicalHeaders,
    'content-length;content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    date,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${configuration.secretAccessKey}`, dateStamp), region), service),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const uploadUrl = `https://${host}${canonicalUri}?${query.toString()}&X-Amz-Signature=${signature}`;

  return {
    uploadUrl,
    objectKey: upload.objectKey,
    expiresAt: new Date(now.getTime() + upload.maxAgeSeconds * 1_000).toISOString(),
  };
}

export function createUploadReceipt(
  upload: PreparedMediaUpload,
  expiresAt: string,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify({
    objectKey: upload.objectKey,
    mimeType: upload.mimeType,
    size: upload.size,
    expiresAt,
  } satisfies UploadReceiptPayload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyUploadReceipt(
  receipt: string,
  expected: Omit<UploadReceiptPayload, 'expiresAt'>,
  secret: string,
  now = new Date(),
): void {
  const [payload, suppliedSignature, extra] = receipt.split('.');
  if (!payload || !suppliedSignature || extra) throw new Error('Invalid upload receipt');
  const expectedSignature = createHmac('sha256', secret).update(payload).digest();
  const supplied = Buffer.from(suppliedSignature, 'base64url');
  if (supplied.length !== expectedSignature.length || !timingSafeEqual(supplied, expectedSignature)) {
    throw new Error('Invalid upload receipt');
  }

  let parsed: UploadReceiptPayload;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as UploadReceiptPayload;
  } catch {
    throw new Error('Invalid upload receipt');
  }
  const expiry = parsed ? Date.parse(parsed.expiresAt) : Number.NaN;
  if (
    !parsed ||
    parsed.objectKey !== expected.objectKey ||
    parsed.mimeType !== expected.mimeType ||
    parsed.size !== expected.size ||
    !Number.isFinite(expiry) ||
    expiry <= now.getTime()
  ) {
    throw new Error('Invalid upload receipt');
  }
}
