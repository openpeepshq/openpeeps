import { modelDimensions } from './constants';
import { PostProcessor, RenderContext } from '../types';

const segmentationPixelCount = modelDimensions.height * modelDimensions.width;

const resizeSource = ({
  model,
  maskCanvasContext,
  inputVideoElement,
}: RenderContext) => {
  maskCanvasContext.drawImage(
    inputVideoElement,
    0,
    0,
    inputVideoElement.width,
    inputVideoElement.height,
    0,
    0,
    modelDimensions.width,
    modelDimensions.height,
  );

  const imageData = maskCanvasContext.getImageData(
    0,
    0,
    modelDimensions.width,
    modelDimensions.height,
  );
  const inputMemoryOffset = model._getInputMemoryOffset() / 4;

  for (let i = 0; i < segmentationPixelCount; i++) {
    model.HEAPF32[inputMemoryOffset + i * 3] =
      Number(imageData?.data[i * 4]) / 255;
    model.HEAPF32[inputMemoryOffset + i * 3 + 1] =
      Number(imageData?.data[i * 4 + 1]) / 255;
    model.HEAPF32[inputMemoryOffset + i * 3 + 2] =
      Number(imageData?.data[i * 4 + 2]) / 255;
  }
};

const runInference = ({ model, maskCanvasContext }: RenderContext) => {
  model._runInference();
  const outputMemoryOffset = model._getOutputMemoryOffset() / 4;

  const maskData = new ImageData(modelDimensions.width, modelDimensions.height);

  for (let i = 0; i < segmentationPixelCount; i++) {
    const person = model.HEAPF32[outputMemoryOffset + i];

    // Sets only the alpha component of each pixel.
    maskData.data[i * 4 + 3] = 255 * person;
  }
  maskCanvasContext.putImageData(maskData, 0, 0);
};

export const renderEffect = (
  renderContext: RenderContext,
  postProcessor: PostProcessor,
) => {
  resizeSource(renderContext);
  runInference(renderContext);
  postProcessor(renderContext);
};
