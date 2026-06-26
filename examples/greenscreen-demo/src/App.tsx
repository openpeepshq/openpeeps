import { useCallback, useState } from 'react';
import {
  blurProcessor,
  imageProcessor,
  transformStream,
  videoProcessor,
} from '@openpeeps/greenscreen';
import { Video } from './Video';

const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: { width: 150, height: 150 },
};

export const App = () => {
  const [originalStream, setOriginalStream] = useState<MediaStream>();
  const [blurredStream, setBlurredStream] = useState<MediaStream>();
  const [imageStream, setImageStream] = useState<MediaStream>();
  const [videoStream, setVideoStream] = useState<MediaStream>();
  const [started, setStarted] = useState(false);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
    setOriginalStream(stream);
    setBlurredStream(await transformStream(stream, blurProcessor(12)));
    setImageStream(
      await transformStream(
        stream,
        await imageProcessor('/Tiger_at_Chicago_Brookfield_Zoo.jpg'),
      ),
    );
    setVideoStream(
      await transformStream(
        stream,
        await videoProcessor(
          '/2124_sunset_Tree_Africa_LonelytreeatsunsetCCBYNatureClip720p5000br.mp4',
        ),
      ),
    );
    setStarted(true);
  }, []);

  const stop = useCallback(() => {
    originalStream?.getTracks().forEach((track) => track.stop());
    setOriginalStream(undefined);
    setBlurredStream(undefined);
    setImageStream(undefined);
    setVideoStream(undefined);
    setStarted(false);
  }, [originalStream]);

  return (
    <main className="page">
      <h1>Welcome to the demo for GreenScreen by AllPeeP</h1>
      <p>
        This demo uses <code>@openpeeps/greenscreen</code> to blur or replace
        the background of a camera stream.
      </p>
      <p>
        <button type="button" onClick={start} disabled={started}>
          Start
        </button>{' '}
        <button type="button" onClick={stop} disabled={!started}>
          Stop
        </button>
      </p>
      {started ? (
        <div className="video-grid">
          <div className="video-box">
            <h2>Original</h2>
            <Video stream={originalStream} />
          </div>
          <div className="video-box">
            <h2>Blurred</h2>
            <Video stream={blurredStream} />
          </div>
          <div className="video-box">
            <h2>Image</h2>
            <Video stream={imageStream} />
          </div>
          <div className="video-box">
            <h2>Video</h2>
            <Video stream={videoStream} />
            <p className="cc-by">Lonely Tree at sunset CC-BY NatureClip</p>
          </div>
        </div>
      ) : null}
    </main>
  );
};
