import {
  Dimensions,
  RenderContext,
  TFLiteEngine,
  TrackParameters,
} from '../types';
import { getTrackParameters } from './utils';

export const initializeRenderContext = async (
  stream: MediaStream,
  model: TFLiteEngine,
  modelDimensions: Dimensions,
): Promise<RenderContext> => {
  const trackParameters: TrackParameters = getTrackParameters(
    stream.getVideoTracks()[0],
  );
  const maskImageData = new ImageData(
    modelDimensions.width,
    modelDimensions.height,
  );

  const maskCanvasElement = document.createElement('canvas');
  maskCanvasElement.width = modelDimensions.width;
  maskCanvasElement.height = modelDimensions.height;

  const outputCanvasElement = document.createElement('canvas');
  outputCanvasElement.width = trackParameters.width;
  outputCanvasElement.height = trackParameters.height;

  const inputVideoElement = document.createElement('video');

  inputVideoElement.width = trackParameters.width;
  inputVideoElement.height = trackParameters.height;
  inputVideoElement.autoplay = true;
  inputVideoElement.srcObject = stream;

  const maskCanvasContext = maskCanvasElement.getContext('2d', {
    willReadFrequently: true,
  });
  const outputCanvasContext = outputCanvasElement.getContext('2d', {
    willReadFrequently: true,
  });

  if (maskCanvasContext === null || outputCanvasContext === null) {
    throw new Error('No canvas context');
  }

  return {
    model,
    modelDimensions,
    trackParameters,
    maskImageData,
    maskCanvasContext,
    outputCanvasContext,
    inputVideoElement,
  };
};
