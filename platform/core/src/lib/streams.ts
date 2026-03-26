import { ReadStream } from 'node:fs';

async function* nodeStreamToIterator(stream: ReadStream) {
  for await (const chunk of stream) {
    yield chunk;
  }
}
function iteratorToStream(iterator: AsyncGenerator<any, void, unknown>) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();

      if (done) {
        controller.close();
      } else {
        controller.enqueue(new Uint8Array(value));
      }
    },
  });
}

export const readStreamToReadableStream = (
  readStream: ReadStream,
): ReadableStream => {
  return iteratorToStream(nodeStreamToIterator(readStream));
};
