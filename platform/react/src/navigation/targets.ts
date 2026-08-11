/**
 * Abstract navigation destinations. Host apps (web) map these to concrete
 * paths via a Navigator — domain code must not hard-code URL strings.
 */
export type NavTarget =
  | { type: 'home' }
  | { type: 'welcome' }
  | { type: 'explore' }
  | { type: 'feed'; feed: 'local' | 'my' | 'bookmarks' }
  | { type: 'profile'; handle: string; tab?: 'followers' | 'following' }
  | { type: 'post'; id: string }
  | { type: 'postNew' }
  | { type: 'group'; handle?: string; view?: 'info' | 'edit' | 'members' }
  | { type: 'groups'; view?: 'new' }
  | { type: 'conversation'; id?: string; view?: 'info' | 'new' }
  | { type: 'jam'; id?: string; view?: 'event' }
  | { type: 'jams'; view?: 'my' }
  | { type: 'events'; view?: 'my' | 'new'; eventId?: string }
  | { type: 'articles'; view?: 'new'; articleId?: string }
  | { type: 'members' }
  | { type: 'notifications' }
  | { type: 'tags'; hashtag: string }
  | {
      type: 'auth';
      mode:
        | 'login'
        | 'register'
        | 'closed'
        | 'validate-email'
        | 'reset-password'
        | 'request-reset-password';
      redirect?: NavTarget;
    }
  | { type: 'admin'; section?: string; handle?: string }
  | { type: 'settings'; section?: string }
  | { type: 'about' }
  | { type: 'codeOfConduct' }
  | { type: 'docs'; path?: string }
  | { type: 'paymentSuccess' }
  | { type: 'external'; href: string }
  | { type: 'path'; path: string };

export type NavItemDef = {
  id: string;
  target: NavTarget;
  labelKey: string;
  /** Lucide (or similar) icon component name — host maps to actual icon. */
  icon?: string;
  end?: boolean;
  pill?: number;
};

/** Encode a redirect NavTarget into a query-safe string (JSON). */
export const encodeNavRedirect = (target: NavTarget): string =>
  encodeURIComponent(JSON.stringify(target));

export const decodeNavRedirect = (
  raw: string | null | undefined,
): NavTarget | null => {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as NavTarget;
  } catch {
    return null;
  }
};
