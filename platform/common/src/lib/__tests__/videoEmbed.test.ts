import { describe, expect, it } from 'vitest';
import { videoEmbedForUrl } from '../videoEmbed';

const YT_ORIGIN = 'https://www.youtube-nocookie.com';
const VIMEO_ORIGIN = 'https://player.vimeo.com';

describe('videoEmbedForUrl', () => {
  it('embeds YouTube watch URLs', () => {
    expect(
      videoEmbedForUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toEqual({
      provider: 'youtube',
      embedUrl: `${YT_ORIGIN}/embed/dQw4w9WgXcQ`,
      origin: YT_ORIGIN,
    });
  });

  it('maps t= timestamps to start and ignores other query params', () => {
    expect(
      videoEmbedForUrl(
        'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123',
      )?.embedUrl,
    ).toBe(`${YT_ORIGIN}/embed/dQw4w9WgXcQ?start=42`);
  });

  it('maps start= and common timestamp formats', () => {
    const expectStart = (url: string, start: string) =>
      expect(videoEmbedForUrl(url)?.embedUrl).toBe(
        `${YT_ORIGIN}/embed/dQw4w9WgXcQ?start=${start}`,
      );
    expectStart('https://youtu.be/dQw4w9WgXcQ?t=42', '42');
    expectStart('https://youtu.be/dQw4w9WgXcQ?t=1:30', '90');
    expectStart('https://youtu.be/dQw4w9WgXcQ?t=1m30s', '90');
    expectStart('https://youtu.be/dQw4w9WgXcQ?t=1h2m3s', '3723');
    expectStart('https://youtube.com/watch?v=dQw4w9WgXcQ&start=5', '5');
  });

  it('ignores malformed timestamps', () => {
    expect(
      videoEmbedForUrl('https://youtu.be/dQw4w9WgXcQ?t=banana')?.embedUrl,
    ).toBe(`${YT_ORIGIN}/embed/dQw4w9WgXcQ`);
  });

  it('embeds youtu.be short links', () => {
    expect(videoEmbedForUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      embedUrl: `${YT_ORIGIN}/embed/dQw4w9WgXcQ`,
      origin: YT_ORIGIN,
    });
  });

  it('embeds YouTube shorts', () => {
    expect(
      videoEmbedForUrl('https://www.youtube.com/shorts/abc123def45'),
    ).toEqual({
      provider: 'youtube',
      embedUrl: `${YT_ORIGIN}/embed/abc123def45`,
      origin: YT_ORIGIN,
    });
  });

  it('embeds already-embedded YouTube URLs', () => {
    expect(
      videoEmbedForUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')?.embedUrl,
    ).toBe(`${YT_ORIGIN}/embed/dQw4w9WgXcQ`);
  });

  it('embeds numeric Vimeo URLs with dnt', () => {
    expect(videoEmbedForUrl('https://vimeo.com/76979871')).toEqual({
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/76979871?dnt=1',
      origin: VIMEO_ORIGIN,
    });
  });

  it('embeds channels and groups video URLs', () => {
    expect(
      videoEmbedForUrl('https://vimeo.com/channels/staffpicks/76979871')
        ?.embedUrl,
    ).toBe('https://player.vimeo.com/video/76979871?dnt=1');
    expect(
      videoEmbedForUrl('https://vimeo.com/groups/1234/videos/76979871')
        ?.embedUrl,
    ).toBe('https://player.vimeo.com/video/76979871?dnt=1');
  });

  it('carries unlisted privacy hashes through', () => {
    expect(
      videoEmbedForUrl('https://vimeo.com/76979871/abcdef12')?.embedUrl,
    ).toBe('https://player.vimeo.com/video/76979871?dnt=1&h=abcdef12');
    expect(
      videoEmbedForUrl('https://player.vimeo.com/video/76979871?h=abcdef12')
        ?.embedUrl,
    ).toBe('https://player.vimeo.com/video/76979871?dnt=1&h=abcdef12');
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
    expect(
      videoEmbedForUrl('https://vimeo.com/showcase/1234567'),
    ).toBeUndefined();
    expect(videoEmbedForUrl('https://vimeo.com/album/1234567')).toBeUndefined();
    expect(videoEmbedForUrl('https://vimeo.com/user/1234567')).toBeUndefined();
    expect(
      videoEmbedForUrl('https://vimeo.com/channels/staffpicks'),
    ).toBeUndefined();
    expect(
      videoEmbedForUrl('https://player.vimeo.com/hd/76979871'),
    ).toBeUndefined();
  });

  it('does not embed invalid URLs', () => {
    expect(videoEmbedForUrl('not a url')).toBeUndefined();
    expect(videoEmbedForUrl('')).toBeUndefined();
  });
});
