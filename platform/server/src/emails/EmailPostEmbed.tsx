import { Head, Tailwind } from '@react-email/components';
import type { EmailGlobals, PublicPost } from '@openpeepshq/common/types';
import {
  FeedPostContent,
  I18nContext,
  StaticRenderContext,
} from '@openpeepshq/react/email';
import type { I18nContextValue } from '@openpeepshq/react/email';

import { buildEmailTailwindConfig } from './tailwindConfig';

export interface EmailPostEmbedProps {
  post: PublicPost;
  globals: EmailGlobals;
}

/**
 * Renders {@link FeedPostContent} (the same component used in the in-app feed,
 * without interaction chrome) inside notification emails. Tailwind utility
 * classes are compiled to inline styles via `@react-email/components` `<Tailwind>`.
 */
const emailMarkdownCss = (primaryColor: string) => `
.allpeep-markdown p { margin: 0.5em 0; }
.allpeep-markdown a { color: ${primaryColor}; text-decoration: underline; }
.allpeep-markdown strong { font-weight: 600; }
.allpeep-markdown ul, .allpeep-markdown ol { padding-left: 1.5em; margin: 0.5em 0; }
.allpeep-markdown pre { overflow-x: auto; max-width: 100%; }
`;

export const EmailPostEmbed = ({ post, globals }: EmailPostEmbedProps) => {
  const config = buildEmailTailwindConfig(globals.communityConfig);
  const baseUrl = globals.serverData.rootUrl;
  const primaryColor =
    globals.communityConfig.theme?.light?.primaryHex ??
    globals.communityConfig.theme?.primaryHex ??
    '#55acba';

  // Providers must wrap <Tailwind>: the Tailwind compiler walks the element
  // tree and may invoke component render functions outside a provider subtree.
  // <Head> is required so non-inlinable utilities (e.g. hover:) have a place
  // for their <style> rules — without it, event embeds render empty.
  return (
    <StaticRenderContext.Provider value={{ enabled: true, baseUrl }}>
      <I18nContext.Provider
        value={globals.i18nContext as unknown as I18nContextValue}
      >
        <Tailwind config={config}>
          <Head />
          <style>{emailMarkdownCss(primaryColor)}</style>
          <div className="border-border bg-surface-100 mt-2 rounded-md border p-3">
            <FeedPostContent post={post} />
          </div>
        </Tailwind>
      </I18nContext.Provider>
    </StaticRenderContext.Provider>
  );
};
