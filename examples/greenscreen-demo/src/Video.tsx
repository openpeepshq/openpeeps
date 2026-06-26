import { useEffect, useRef } from 'react';

export interface VideoProps {
  stream?: MediaStream;
}

export const Video = ({ stream }: VideoProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;
    el.srcObject = stream;
  }, [stream]);

  if (!stream) return null;

  return <video ref={ref} autoPlay playsInline style={{ height: 150 }} />;
};
