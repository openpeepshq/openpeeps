export { OpenpeepsMarkdown } from './OpenpeepsMarkdown';
export type {
  OpenpeepsMarkdownProps,
  MarkdownMention,
} from './OpenpeepsMarkdown';
export type { MarkdownRenderProps } from '@openpeepshq/common/lib';
export {
  OPENPEEPS_MARKDOWN_PROSE_CLASS,
  OPENPEEPS_MARKDOWN_STATIC_CLASS,
  OPENPEEPS_POST_CAPTION_CLASS,
} from './classes';
export { compileMarkdownToHtml } from './compileMarkdown';
export type { CompileMarkdownOptions } from './compileMarkdown';
export { CompiledMarkdown } from './CompiledMarkdown';
export type { CompiledMarkdownProps } from './CompiledMarkdown';
export {
  StaticRenderContext,
  useStaticRender,
  resolveStaticUrl,
} from './staticRender';
export type { StaticRenderContextValue } from './staticRender';

/** @deprecated Use OpenpeepsMarkdown */
export { OpenpeepsMarkdown as PostMarkdown } from './OpenpeepsMarkdown';
export type { OpenpeepsMarkdownProps as PostMarkdownProps } from './OpenpeepsMarkdown';
