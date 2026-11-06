const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,15}$/;
const VIMEO_ID_RE = /^\d{6,}$/;
const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com';
const VIMEO_ORIGIN = 'https://player.vimeo.com';

export interface VideoEmbed {
  provider: 'youtube' | 'vimeo';
  embedUrl: string;
  /** Origin of `embedUrl`, for same-origin checks in WebView guards. */
  origin: string;
}

/**
 * Maps a YouTube `t=`/`start=` timestamp to seconds. Accepts `42`, `42s`,
 * `1:30`, `1m30s`, and `1h2m3s` forms.
 */
const parseYouTubeStart = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const compact = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (compact) {
    const [, hours, minutes, seconds] = compact;
    if (!hours && !minutes && !seconds) return undefined;
    return (
      Number(hours ?? 0) * 3600 +
      Number(minutes ?? 0) * 60 +
      Number(seconds ?? 0)
    );
  }
  const parts = trimmed.split(':');
  if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return undefined;
  }
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
};

const youtubeEmbed = (id: string, parsed: URL): VideoEmbed => {
  const rawStart =
    parsed.searchParams.get('t') ?? parsed.searchParams.get('start');
  const start = rawStart ? parseYouTubeStart(rawStart) : undefined;
  return {
    provider: 'youtube',
    embedUrl:
      `${YOUTUBE_ORIGIN}/embed/${id}` +
      (start !== undefined && start > 0 ? `?start=${start}` : ''),
    origin: YOUTUBE_ORIGIN,
  };
};

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
    return YOUTUBE_ID_RE.test(id) ? youtubeEmbed(id, parsed) : undefined;
  }

  if (host === 'youtube.com') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    let id: string | undefined;
    if (segments[0] === 'watch') {
      id = parsed.searchParams.get('v') ?? undefined;
    } else if (segments[0] === 'shorts' || segments[0] === 'embed') {
      id = segments[1];
    }
    return id && YOUTUBE_ID_RE.test(id) ? youtubeEmbed(id, parsed) : undefined;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    let id: string | undefined;
    let hash: string | undefined;
    if (host === 'player.vimeo.com') {
      if (segments[0] === 'video') {
        id = segments[1];
        hash = parsed.searchParams.get('h') ?? undefined;
      }
    } else if (segments.length === 1) {
      id = segments[0];
    } else if (segments.length === 2 && VIMEO_ID_RE.test(segments[0])) {
      // `vimeo.com/<id>/<hash>` — unlisted videos carry the privacy hash
      // in the path.
      id = segments[0];
      hash = segments[1];
    } else if (segments.length === 3 && segments[0] === 'channels') {
      id = segments[2];
    } else if (
      segments.length === 4 &&
      segments[0] === 'groups' &&
      segments[2] === 'videos'
    ) {
      id = segments[3];
    }
    if (!id || !VIMEO_ID_RE.test(id)) return undefined;
    return {
      provider: 'vimeo',
      embedUrl:
        `${VIMEO_ORIGIN}/video/${id}?dnt=1` + (hash ? `&h=${hash}` : ''),
      origin: VIMEO_ORIGIN,
    };
  }

  return undefined;
};
