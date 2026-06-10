import { Tailwind } from '@react-email/components';
import type { EmailGlobals, PublicPost } from '@openpeeps/common/types';
import {
  FeedPostContent,
  I18nContext,
  StaticRenderContext,
} from '@openpeeps/react/email';
import type { I18nContextValue } from '@openpeeps/react/email';

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
  return (
    <StaticRenderContext.Provider value={{ enabled: true, baseUrl }}>
      <I18nContext.Provider
        value={globals.i18nContext as unknown as I18nContextValue}
      >
        <Tailwind config={config}>
          <style>{emailMarkdownCss(primaryColor)}</style>
          <div className="mt-2 rounded-md border border-border bg-surface-100 p-3">
            <FeedPostContent post={post} />
          </div>
        </Tailwind>
      </I18nContext.Provider>
    </StaticRenderContext.Provider>
  );
};
