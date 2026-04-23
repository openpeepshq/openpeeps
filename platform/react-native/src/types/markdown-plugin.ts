/**
 * Subset of markdown-it inline `state` used by custom ruler plugins.
 */
export interface MarkdownInlineRulerState {
  pos: number;
  src: string;
  push: (type: string, tag: string, nesting: number) => {
    content: string;
    markup: string;
    info: string;
    meta?: { displayName?: string; handle?: string };
  };
}
