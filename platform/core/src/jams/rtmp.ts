import {
  EncodingOptionsPreset,
  StreamOutput,
  StreamProtocol,
} from 'livekit-server-sdk';

export const rtmpStreamOutput = (rtmpUrl: string) =>
  new StreamOutput({
    protocol: StreamProtocol.RTMP,
    urls: [rtmpUrl],
  });

export const rtmpWebEgressOptions = {
  encodingOptions: EncodingOptionsPreset.H264_1080P_30,
} as const;
