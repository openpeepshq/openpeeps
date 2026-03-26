import { PaintCoordinates, PostProcessor, RenderContext } from '../../types';
import { calcCoverCoords, drawForeground, drawMask } from './helpers';

export const imageProcessor = (imageUrl: string): Promise<PostProcessor> => {
  const imageElement = document.createElement('img');
  imageElement.style.objectFit = 'cover';

  let coverCoords: PaintCoordinates | undefined = undefined;

  const result = new Promise<PostProcessor>(
    (resolve) =>
      (imageElement.onload = () => {
        resolve((renderContext: RenderContext) => {
          if (!coverCoords) {
            coverCoords = calcCoverCoords(
              imageElement,
              renderContext.trackParameters,
            );
          }
          drawMask(renderContext);
          drawForeground(renderContext);
          renderContext.outputCanvasContext.globalCompositeOperation =
            'destination-over';
          renderContext.outputCanvasContext.filter = 'none';
          renderContext.outputCanvasContext.drawImage(
            imageElement,
            coverCoords.x,
            coverCoords.y,
            coverCoords.w,
            coverCoords.h,
            0,
            0,
            renderContext.trackParameters.width,
            renderContext.trackParameters.height,
          );
        });
      }),
  );
  imageElement.src = imageUrl;
  return result;
};
