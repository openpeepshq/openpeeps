import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const EMPTY_PAYLOAD_HASH =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const hmacSha256 = (key: Buffer | string, data: string): Buffer =>
  createHmac('sha256', key).update(data, 'utf8').digest();

const sha256Hex = (data: Buffer | string): string =>
  createHash('sha256').update(data).digest('hex');

const rfc3986Encode = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const headerValue = (
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined => {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw.join(',') : String(raw);
};

const canonicalQueryString = (
  query: Record<string, string | string[] | undefined>,
): string => {
  const pairs: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      // Express represents bare `?uploads` as empty string.
      pairs.push([rfc3986Encode(key), rfc3986Encode(String(item))]);
    }
  }
  pairs.sort(([aKey, aVal], [bKey, bVal]) => {
    const keyCmp = aKey.localeCompare(bKey);
    return keyCmp !== 0 ? keyCmp : aVal.localeCompare(bVal);
  });
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
};

const parseAuthorization = (authorization: string) => {
  const match = authorization.match(
    /^AWS4-HMAC-SHA256 Credential=([^,]+),\s*SignedHeaders=([^,]+),\s*Signature=([0-9a-fA-F]+)$/,
  );
  if (!match) return undefined;
  const [, credential, signedHeaders, signature] = match;
  const [accessKey, dateStamp, region, service, requestType] =
    credential.split('/');
  if (
    !accessKey ||
    !dateStamp ||
    !region ||
    !service ||
    requestType !== 'aws4_request'
  ) {
    return undefined;
  }
  return {
    accessKey,
    dateStamp,
    region,
    service,
    signedHeaders: signedHeaders.split(';').map((h) => h.toLowerCase()),
    signature: signature.toLowerCase(),
  };
};

export type SigV4Request = {
  method: string;
  /** Path only, e.g. `/s3/allpeep-recordings/{id}.mp4` */
  path: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: Buffer;
};

export type SigV4VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Verifies an AWS SigV4 Authorization header.
 *
 * For streaming uploads (`STREAMING-AWS4-HMAC-SHA256-PAYLOAD` /
 * `UNSIGNED-PAYLOAD`), only the seed signature is checked — enough to reject
 * unsigned or wrongly-keyed requests without replaying chunk signatures.
 */
export const verifyAwsSigV4 = (
  req: SigV4Request,
  expectedAccessKey: string,
  secretKey: string,
  options?: { now?: Date; maxSkewMs?: number; expectedSessionToken?: string },
): SigV4VerifyResult => {
  const authorization = headerValue(req.headers, 'authorization');
  if (!authorization) {
    return { ok: false, reason: 'missing Authorization' };
  }

  const parsed = parseAuthorization(authorization);
  if (!parsed) {
    return { ok: false, reason: 'malformed Authorization' };
  }

  if (parsed.accessKey !== expectedAccessKey) {
    return { ok: false, reason: 'access key mismatch' };
  }

  const sessionToken = headerValue(req.headers, 'x-amz-security-token');
  const expectedSession = options?.expectedSessionToken ?? expectedAccessKey;
  if (sessionToken !== undefined && sessionToken !== expectedSession) {
    return { ok: false, reason: 'session token mismatch' };
  }

  const amzDate = headerValue(req.headers, 'x-amz-date');
  if (!amzDate || !/^\d{8}T\d{6}Z$/.test(amzDate)) {
    return { ok: false, reason: 'missing or invalid x-amz-date' };
  }
  if (amzDate.slice(0, 8) !== parsed.dateStamp) {
    return { ok: false, reason: 'credential date mismatch' };
  }

  const now = options?.now ?? new Date();
  const maxSkewMs = options?.maxSkewMs ?? 15 * 60 * 1000;
  const year = Number(amzDate.slice(0, 4));
  const month = Number(amzDate.slice(4, 6)) - 1;
  const day = Number(amzDate.slice(6, 8));
  const hour = Number(amzDate.slice(9, 11));
  const minute = Number(amzDate.slice(11, 13));
  const second = Number(amzDate.slice(13, 15));
  const requestTime = Date.UTC(year, month, day, hour, minute, second);
  if (Math.abs(now.getTime() - requestTime) > maxSkewMs) {
    return { ok: false, reason: 'request time skew' };
  }

  const payloadHashHeader = headerValue(req.headers, 'x-amz-content-sha256');
  let payloadHash = payloadHashHeader;
  if (!payloadHash) {
    payloadHash =
      req.body && req.body.byteLength > 0
        ? sha256Hex(req.body)
        : EMPTY_PAYLOAD_HASH;
  } else if (
    payloadHash !== 'UNSIGNED-PAYLOAD' &&
    !payloadHash.startsWith('STREAMING-') &&
    req.body
  ) {
    const actual = sha256Hex(req.body);
    if (actual !== payloadHash.toLowerCase()) {
      return { ok: false, reason: 'payload hash mismatch' };
    }
  }

  const signedHeaderSet = new Set(parsed.signedHeaders);
  if (!signedHeaderSet.has('host') || !signedHeaderSet.has('x-amz-date')) {
    return { ok: false, reason: 'required signed headers missing' };
  }

  const canonicalHeaders = parsed.signedHeaders
    .map((name) => {
      const value = headerValue(req.headers, name);
      if (value === undefined) {
        return undefined;
      }
      return `${name}:${value.trim().replace(/\s+/g, ' ')}\n`;
    })
    .filter((line): line is string => line !== undefined);

  if (canonicalHeaders.length !== parsed.signedHeaders.length) {
    return { ok: false, reason: 'signed header value missing' };
  }

  const canonicalRequest = [
    req.method.toUpperCase(),
    req.path,
    canonicalQueryString(req.query),
    canonicalHeaders.join(''),
    parsed.signedHeaders.join(';'),
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${parsed.dateStamp}/${parsed.region}/${parsed.service}/aws4_request`,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = hmacSha256(
    hmacSha256(
      hmacSha256(
        hmacSha256(`AWS4${secretKey}`, parsed.dateStamp),
        parsed.region,
      ),
      parsed.service,
    ),
    'aws4_request',
  );
  const expectedSignature = createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const actualBuf = Buffer.from(parsed.signature, 'utf8');
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return { ok: false, reason: 'signature mismatch' };
  }

  return { ok: true };
};
