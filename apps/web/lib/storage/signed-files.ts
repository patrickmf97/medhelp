import { createHash, createHmac } from 'node:crypto';

export interface R2DownloadConfiguration {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface SignedDownload {
  downloadUrl: string;
  expiresAt: string;
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Signs a short-lived GET request for a private R2 object, so a file never
 * needs a public bucket or to be proxied through the application server.
 * `downloadFileName` only controls the suggested filename on the browser's
 * side (via response-content-disposition); it never changes which object is
 * fetched, so it is safe to build from user-supplied titles.
 */
export function createSignedDownload(
  objectKey: string,
  downloadFileName: string,
  configuration: R2DownloadConfiguration,
  maxAgeSeconds = 300,
  now = new Date(),
): SignedDownload {
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = date.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const host = `${configuration.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encode(configuration.bucketName)}/${objectKey
    .split('/')
    .map(encode)
    .join('/')}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const safeFileName = downloadFileName.replace(/["\\]/g, '').slice(0, 180) || 'arquivo';
  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'X-Amz-Credential': `${configuration.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': date,
    'X-Amz-Expires': String(maxAgeSeconds),
    'X-Amz-SignedHeaders': 'host',
    'response-content-disposition': `attachment; filename="${safeFileName}"`,
  });
  query.sort();

  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    'GET',
    canonicalUri,
    query.toString(),
    canonicalHeaders,
    'host',
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
  const downloadUrl = `https://${host}${canonicalUri}?${query.toString()}&X-Amz-Signature=${signature}`;

  return {
    downloadUrl,
    expiresAt: new Date(now.getTime() + maxAgeSeconds * 1_000).toISOString(),
  };
}
