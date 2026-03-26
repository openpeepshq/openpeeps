import { Dimensions, RenderContext } from '../../types';

export const drawMask = (
  {
    outputCanvasContext,
    maskCanvasContext,
    modelDimensions,
    trackParameters,
  }: RenderContext,
  blurRadius: number = 4,
) => {
  outputCanvasContext.globalCompositeOperation = 'copy';
  outputCanvasContext.filter = `blur(${blurRadius}px)`;
  outputCanvasContext.drawImage(
    maskCanvasContext.canvas,
    0,
    0,
    modelDimensions.width,
    modelDimensions.height,
    0,
    0,
    trackParameters.width,
    trackParameters.height,
  );
};

export const drawForeground = ({
  outputCanvasContext,
  inputVideoElement,
}: RenderContext) => {
  outputCanvasContext.globalCompositeOperation = 'source-in';
  outputCanvasContext.filter = 'none';
  outputCanvasContext.drawImage(inputVideoElement, 0, 0);
};

export const calcCoverCoords = (
  sourceDimensions: Dimensions,
  targetDimensions: Dimensions,
) => {
  const ratioRatio =
    sourceDimensions.width /
    sourceDimensions.height /
    (targetDimensions.width / targetDimensions.height);

  if (ratioRatio > 1) {
    const w = sourceDimensions.width / ratioRatio;
    return {
      x: (sourceDimensions.width - w) / 2,
      y: 0,
      w,
      h: sourceDimensions.height,
    };
  } else {
    const h = sourceDimensions.height * ratioRatio;
    return {
      x: 0,
      y: (sourceDimensions.height - h) / 2,
      w: sourceDimensions.width,
      h,
    };
  }
};
