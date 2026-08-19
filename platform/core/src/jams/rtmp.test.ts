import { describe, expect, it, vi } from 'vitest';
import { EncodingOptionsPreset, StreamProtocol } from 'livekit-server-sdk';
import { rtmpStreamOutput, rtmpWebEgressOptions } from './rtmp';

describe('rtmpStreamOutput', () => {
  it('builds a LiveKit RTMP StreamOutput for observer-page web egress', () => {
    const startWebEgress = vi.fn();
    const rtmpUrl = 'rtmps://live.streamyard.com/x/stream-key';
    const observerUrl =
      'https://example.com/events/jam-1/jam?observer=true&token=svc';
    const output = rtmpStreamOutput(rtmpUrl);

    expect(output.protocol).toBe(StreamProtocol.RTMP);
    expect(output.urls).toEqual([rtmpUrl]);
    expect(rtmpWebEgressOptions.encodingOptions).toBe(
      EncodingOptionsPreset.H264_1080P_30,
    );

    startWebEgress(observerUrl, output, rtmpWebEgressOptions);
    expect(startWebEgress).toHaveBeenCalledWith(
      observerUrl,
      output,
      rtmpWebEgressOptions,
    );
  });
});
