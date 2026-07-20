import { notFound } from '../errors';

export const throwIfUndefined = <T>(maybeObject: T | undefined): T => {
  if (!maybeObject) {
    throw notFound({ errorKey: 'error.notFound' });
  } else {
    return maybeObject;
  }
};

export const toArrayBuffer = (
  data: SharedArrayBuffer | ArrayBuffer,
): ArrayBuffer => {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(new Uint8Array(data));
  return copy;
};
