import { describe, expect, it } from 'vitest';
import { videoEmbedForUrl } from '../videoEmbed';

describe('videoEmbedForUrl', () => {
  it('embeds YouTube watch URLs', () => {
    expect(
      videoEmbedForUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
  });

  it('ignores extra query params on watch URLs', () => {
    expect(
      videoEmbedForUrl(
        'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123',
      )?.embedUrl,
    ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('embeds youtu.be short links', () => {
    expect(videoEmbedForUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
  });

  it('embeds YouTube shorts', () => {
    expect(
      videoEmbedForUrl('https://www.youtube.com/shorts/abc123def45'),
    ).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/abc123def45',
    });
  });

  it('embeds already-embedded YouTube URLs', () => {
    expect(
      videoEmbedForUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')?.embedUrl,
    ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('embeds numeric Vimeo URLs', () => {
    expect(videoEmbedForUrl('https://vimeo.com/76979871')).toEqual({
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/76979871',
    });
  });

  it('does not embed non-video URLs', () => {
    expect(videoEmbedForUrl('https://example.com/article')).toBeUndefined();
    expect(
      videoEmbedForUrl('https://www.youtube.com/@channel'),
    ).toBeUndefined();
    expect(
      videoEmbedForUrl('https://www.youtube.com/watch?list=PL123'),
    ).toBeUndefined();
    expect(videoEmbedForUrl('https://youtu.be/short')).toBeUndefined();
    expect(videoEmbedForUrl('https://vimeo.com/someuser')).toBeUndefined();
  });

  it('does not embed invalid URLs', () => {
    expect(videoEmbedForUrl('not a url')).toBeUndefined();
    expect(videoEmbedForUrl('')).toBeUndefined();
  });
});
