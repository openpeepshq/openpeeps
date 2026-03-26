import modelDataBase64 from '../vendor/models/selfie_segmentation_landscape.tflite.base64';
import { toBytes } from 'fast-base64';
import { TFLiteEngine } from '../types';
import { loadTfLite } from './tflite';

let modelPromise: Promise<TFLiteEngine> | undefined;

const initModel = async (): Promise<TFLiteEngine> => {
  const engine = await loadTfLite();

  const modelBuffer = await toBytes(modelDataBase64);
  engine.HEAPU8.set(
    new Uint8Array(modelBuffer),
    engine._getModelBufferMemoryOffset(),
  );

  engine._loadModel(modelBuffer.byteLength);
  return engine;
};

export const getModel = () => {
  if (!modelPromise) {
    modelPromise = initModel();
  }
  return modelPromise;
};
