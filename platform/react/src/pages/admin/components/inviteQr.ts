import * as QRCode from 'qrcode';
import type { CommunityConfig } from '@openpeepshq/common/types';

const QR_SIZE = 512;
const LOGO_RATIO = 0.2;

/** Invitation signup URL — this path skips closed-registration redirects. */
export const inviteUrl = (slug: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/auth/register/invitation?inviteCode=${slug}`;
};

export const inviteQrFilename = (slug: string) => `invite-${slug}.png`;

/** Prefer the light-background logo so it stays visible on a white QR. */
export const communityQrLogoSrc = (
  config: CommunityConfig | null | undefined,
): string | undefined =>
  config?.theme?.light?.logoSmall ||
  config?.theme?.icon ||
  config?.theme?.dark?.logoSmall ||
  undefined;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

const overlayLogo = async (
  qrDataUrl: string,
  logoSrc: string,
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = QR_SIZE;
  canvas.height = QR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrDataUrl;

  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, 0, 0, QR_SIZE, QR_SIZE);

  const logo = await loadImage(logoSrc);
  if (!logo.width || !logo.height) return qrDataUrl;
  const logoSize = Math.round(QR_SIZE * LOGO_RATIO);
  const pad = Math.round(logoSize * 0.18);
  const box = logoSize + pad * 2;
  const boxX = (QR_SIZE - box) / 2;
  const boxY = (QR_SIZE - box) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, box, box, Math.round(box * 0.16));
  ctx.fill();

  const scale = Math.min(logoSize / logo.width, logoSize / logo.height);
  const w = logo.width * scale;
  const h = logo.height * scale;
  ctx.drawImage(logo, (QR_SIZE - w) / 2, (QR_SIZE - h) / 2, w, h);

  return canvas.toDataURL('image/png');
};

export const inviteQrDataUrl = async (
  url: string,
  logoSrc?: string,
): Promise<string> => {
  const qr = await QRCode.toDataURL(url, {
    width: QR_SIZE,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' },
  });
  if (!logoSrc || typeof document === 'undefined') return qr;
  try {
    return await overlayLogo(qr, logoSrc);
  } catch {
    return qr;
  }
};

export const downloadInviteQr = async (
  slug: string,
  logoSrc?: string,
): Promise<void> => {
  const dataUrl = await inviteQrDataUrl(inviteUrl(slug), logoSrc);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = inviteQrFilename(slug);
  a.click();
};
