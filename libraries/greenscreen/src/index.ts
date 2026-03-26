import { PostProcessor } from './types';
import { getModel } from './lib/model';
import {
  SET_TIMEOUT,
  TIMEOUT_TICK,
  timerWorkerScript,
} from './lib/TimerWorker';

import { modelDimensions } from './lib/constants';
import { initializeRenderContext } from './lib/renderContext';
import { renderEffect } from './lib/renderer';

export { blurProcessor } from './lib/processors/blur';
export { imageProcessor } from './lib/processors/image';
export { videoProcessor } from './lib/processors/video';

export const getVideoStream = async (
  constraints: MediaStreamConstraints,
  postProcessor: PostProcessor,
) => {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  return transformStream(stream, postProcessor);
};

export const transformStream = async (
  stream: MediaStream,
  postProcessor: PostProcessor,
): Promise<MediaStream> => {
  if (!stream.getVideoTracks().length) {
    throw new Error('No video tracks found.');
  }

  const model = await getModel();

  const maskFrameTimerWorker = new Worker(timerWorkerScript, {
    name: 'Blur effect worker',
  });

  const renderContext = await initializeRenderContext(
    stream,
    model,
    modelDimensions,
  );

  renderContext.inputVideoElement.onloadeddata = () => {
    maskFrameTimerWorker.postMessage({
      id: SET_TIMEOUT,
      timeMs: 1000 / 30,
    });
  };

  maskFrameTimerWorker.onmessage = (response: { data: { id: number } }) => {
    if (response.data.id === TIMEOUT_TICK) {
      if (stream.getVideoTracks()[0].readyState !== 'live') {
        maskFrameTimerWorker.terminate();
        return;
      }

      renderEffect(renderContext, postProcessor);
      maskFrameTimerWorker.postMessage({
        id: SET_TIMEOUT,
        timeMs: 1000 / 30,
      });
    }
  };

  return renderContext.outputCanvasContext?.canvas.captureStream(
    renderContext.trackParameters.frameRate,
  );
};
