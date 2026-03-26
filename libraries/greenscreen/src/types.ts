export interface TFLiteEngine {
  HEAPU8: {
    set: (bytes: Uint8Array, offset: number) => void;
  };
  HEAPF32: number[];
  _getModelBufferMemoryOffset: () => number;
  _getInputMemoryOffset: () => number;
  _loadModel: (length: number) => void;
  _runInference: () => void;
  _getOutputMemoryOffset: () => number;
}

export interface BackgroundEffectOptions {
  height: number;
  virtualBackground: {
    backgroundType?: 'image' | 'blur';
    blurValue?: number;
    virtualSource?: string;
  };
  width: number;
}

export interface PostProcessor {
  (context: RenderContext): void;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface PaintCoordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TrackParameters extends Dimensions {
  frameRate: number;
}

export interface RenderContext {
  model: TFLiteEngine;
  modelDimensions: Dimensions;
  inputVideoElement: HTMLVideoElement;
  outputCanvasContext: CanvasRenderingContext2D;
  maskCanvasContext: CanvasRenderingContext2D;
  maskImageData: ImageData;
  trackParameters: TrackParameters;
}
