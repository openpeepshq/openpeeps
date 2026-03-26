import { PaintCoordinates, PostProcessor, RenderContext } from '../../types';
import { calcCoverCoords, drawForeground, drawMask } from './helpers';

export const videoProcessor = (videoUrl: string): Promise<PostProcessor> => {
  const videoElement = document.createElement('video');
  videoElement.src = videoUrl;
  videoElement.playsInline = true;
  videoElement.autoplay = true;
  videoElement.loop = true;

  let coverCoords: PaintCoordinates | undefined = undefined;

  return new Promise(
    (resolve) =>
      (videoElement.onloadeddata = () =>
        resolve((renderContext: RenderContext) => {
          if (!coverCoords) {
            coverCoords = calcCoverCoords(
              {
                width: videoElement.videoWidth,
                height: videoElement.videoHeight,
              },
              renderContext.trackParameters,
            );
          }

          drawMask(renderContext);
          drawForeground(renderContext);
          renderContext.outputCanvasContext.globalCompositeOperation =
            'destination-over';
          renderContext.outputCanvasContext.filter = 'none';
          renderContext.outputCanvasContext.drawImage(
            videoElement,
            coverCoords.x,
            coverCoords.y,
            coverCoords.w,
            coverCoords.h,
            0,
            0,
            renderContext.trackParameters.width,
            renderContext.trackParameters.height,
          );
        })),
  );
};
