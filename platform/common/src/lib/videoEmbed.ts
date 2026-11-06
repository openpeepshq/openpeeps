const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,15}$/;
const VIMEO_ID_RE = /^\d{6,}$/;

export interface VideoEmbed {
  provider: 'youtube' | 'vimeo';
  embedUrl: string;
}

/**
 * Embed info for plain video URLs on supported providers (YouTube
 * watch/share/shorts/embed, Vimeo). Lets the client render a playable
 * player instead of a link card.
 */
export const videoEmbedForUrl = (url: string): VideoEmbed | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  const host = parsed.hostname.replace(/^(www|m)\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/')[1] ?? '';
    return YOUTUBE_ID_RE.test(id)
      ? {
          provider: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${id}`,
        }
      : undefined;
  }

  if (host === 'youtube.com') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    let id: string | undefined;
    if (segments[0] === 'watch') {
      id = parsed.searchParams.get('v') ?? undefined;
    } else if (segments[0] === 'shorts' || segments[0] === 'embed') {
      id = segments[1];
    }
    return id && YOUTUBE_ID_RE.test(id)
      ? { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
      : undefined;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname
      .split('/')
      .filter(Boolean)
      .find((segment) => VIMEO_ID_RE.test(segment));
    return id
      ? { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` }
      : undefined;
  }

  return undefined;
};
