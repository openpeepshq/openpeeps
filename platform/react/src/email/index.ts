/**
 * SSR-safe surface for rendering post content in server-rendered emails.
 *
 * Imports the concrete content components directly (not the `components/post`
 * barrel) so consumers in non-browser environments (the email worker) don't
 * pull in interactive/livekit/emoji-picker code paths.
 */
export { FeedPostContent } from '../components/post/FeedPostContent';
export type { FeedPostContentProps } from '../components/post/FeedPostContent';
export {
  StaticRenderContext,
  resolveStaticUrl,
  useStaticRender,
} from '../components/markdown/staticRender';
export type { StaticRenderContextValue } from '../components/markdown/staticRender';
export { I18nContext } from '../i18n/context';
export type { I18nContextValue } from '../i18n/context';
