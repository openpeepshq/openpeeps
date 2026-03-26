import { TFLiteEngine } from '../types';
// @ts-expect-error no types for TFLite
import tfLiteSIMD from '../vendor/tflite/tflite-simd.js';

export const loadTfLite = async (): Promise<TFLiteEngine> => {
  return tfLiteSIMD() as TFLiteEngine;
};
