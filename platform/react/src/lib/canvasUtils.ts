import { randomString } from '@openpeeps/common/lib';

const imageFileExtension = 'webp';
const imageFileFormat = `image/${imageFileExtension}`;

export type ImageSource = string | File;

const canvasToFile = (canvas: HTMLCanvasElement): Promise<File> =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(
              new File([blob], `${randomString(8)}.${imageFileExtension}`, {
                type: imageFileFormat,
              }),
            )
          : reject(new Error('Error converting canvas to file')),
      imageFileFormat,
      0.9,
    ),
  );

export const createImage = (imageSrc: ImageSource): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src =
      typeof imageSrc === 'string' ? imageSrc : URL.createObjectURL(imageSrc);
  });

export const centerCropToAspectRatio = async (
  imageSrc: ImageSource,
  aspectW: number,
  aspectH: number,
): Promise<File> => {
  const image = await createImage(imageSrc);
  const iw = image.width;
  const ih = image.height;
  const targetRatio = aspectW / aspectH;
  const imgRatio = iw / ih;

  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;

  if (imgRatio > targetRatio) {
    sh = ih;
    sw = Math.round(ih * targetRatio);
    sx = Math.round((iw - sw) / 2);
    sy = 0;
  } else {
    sw = iw;
    sh = Math.round(iw / targetRatio);
    sx = 0;
    sy = Math.round((ih - sh) / 2);
  }

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

  return canvasToFile(canvas);
};

export async function convertToWebpIfHeic(file: File): Promise<File> {
  const isHeic =
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif') ||
    file.type.includes('heic');

  if (!isHeic) return file;
  if (typeof window === 'undefined') return file;

  try {
    const heic2any = (await import('heic2any')).default;
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/webp',
      quality: 0.9,
    });
    return new File(
      [convertedBlob as BlobPart],
      file.name.replace(/\.(heic|heif)$/i, '.webp'),
      { type: 'image/webp' },
    );
  } catch {
    return file;
  }
}
