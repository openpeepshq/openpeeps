import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyAwsSigV4 } from '../s3SigV4';

const sha256Hex = (data: string | Buffer) =>
  createHash('sha256').update(data).digest('hex');

const hmac = (key: Buffer | string, data: string) =>
  createHmac('sha256', key).update(data, 'utf8').digest();

const signRequest = (opts: {
  method: string;
  path: string;
  query: Record<string, string>;
  host: string;
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  amzDate: string;
  region?: string;
  payloadHash?: string;
  body?: Buffer;
}) => {
  const region = opts.region ?? 'us-east-1';
  const dateStamp = opts.amzDate.slice(0, 8);
  const payloadHash =
    opts.payloadHash ??
    (opts.body ? sha256Hex(opts.body) : sha256Hex(Buffer.alloc(0)));

  const headers: Record<string, string> = {
    host: opts.host,
    'x-amz-date': opts.amzDate,
    'x-amz-content-sha256': payloadHash,
    'x-amz-security-token': opts.sessionToken,
    authorization: 'placeholder',
  };

  const signedHeaders = [
    'host',
    'x-amz-content-sha256',
    'x-amz-date',
    'x-amz-security-token',
  ];
  const canonicalHeaders = signedHeaders
    .map((name) => `${name}:${headers[name]}\n`)
    .join('');
  const canonicalQuery = Object.keys(opts.query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(opts.query[k])}`)
    .join('&');

  const canonicalRequest = [
    opts.method,
    opts.path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders.join(';'),
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    opts.amzDate,
    `${dateStamp}/${region}/s3/aws4_request`,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${opts.secretKey}`, dateStamp), region), 's3'),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex');

  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${dateStamp}/${region}/s3/aws4_request, ` +
    `SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;

  return headers;
};

describe('verifyAwsSigV4', () => {
  const accessKey = '019abc-recording-id';
  const secretKey = 'derived-secret-hex';
  const path = `/s3/allpeep-recordings/${accessKey}.mp4`;
  const amzDate = '20260809T120000Z';
  const now = new Date(Date.UTC(2026, 7, 9, 12, 0, 0));

  it('accepts a correctly signed request', () => {
    const headers = signRequest({
      method: 'PUT',
      path,
      query: {},
      host: 'community.example',
      accessKey,
      secretKey,
      sessionToken: accessKey,
      amzDate,
      payloadHash: 'UNSIGNED-PAYLOAD',
    });

    const result = verifyAwsSigV4(
      {
        method: 'PUT',
        path,
        query: {},
        headers,
      },
      accessKey,
      secretKey,
      { now, expectedSessionToken: accessKey },
    );
    expect(result).toEqual({ ok: true });
  });

  it('rejects unsigned requests', () => {
    const result = verifyAwsSigV4(
      {
        method: 'PUT',
        path,
        query: {},
        headers: { host: 'community.example', 'x-amz-date': amzDate },
      },
      accessKey,
      secretKey,
      { now },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing Authorization');
  });

  it('rejects wrong secret signatures', () => {
    const headers = signRequest({
      method: 'POST',
      path,
      query: { uploads: '' },
      host: 'community.example',
      accessKey,
      secretKey: 'wrong-secret',
      sessionToken: accessKey,
      amzDate,
      payloadHash: 'UNSIGNED-PAYLOAD',
    });

    const result = verifyAwsSigV4(
      {
        method: 'POST',
        path,
        query: { uploads: '' },
        headers,
      },
      accessKey,
      secretKey,
      { now, expectedSessionToken: accessKey },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('signature mismatch');
  });

  it('rejects access key mismatch', () => {
    const headers = signRequest({
      method: 'PUT',
      path,
      query: {},
      host: 'community.example',
      accessKey: 'other-id',
      secretKey,
      sessionToken: accessKey,
      amzDate,
      payloadHash: 'UNSIGNED-PAYLOAD',
    });

    const result = verifyAwsSigV4(
      {
        method: 'PUT',
        path,
        query: {},
        headers,
      },
      accessKey,
      secretKey,
      { now, expectedSessionToken: accessKey },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('access key mismatch');
  });
});
