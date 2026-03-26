import { PostProcessor, RenderContext } from '../../types';
import { drawForeground, drawMask } from './helpers';

export const blurProcessor =
  (radius: number = 12): PostProcessor =>
  (renderContext: RenderContext) => {
    drawMask(renderContext, 8);
    drawForeground(renderContext);
    renderContext.outputCanvasContext.globalCompositeOperation =
      'destination-over';
    renderContext.outputCanvasContext.filter = `blur(${radius}px)`;
    renderContext.outputCanvasContext.drawImage(
      renderContext.inputVideoElement,
      0,
      0,
    );
  };
