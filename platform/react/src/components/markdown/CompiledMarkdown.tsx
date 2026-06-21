import { OPENPEEPS_MARKDOWN_PROSE_CLASS } from './classes';

export interface CompiledMarkdownProps {
  html: string;
  className?: string;
}

export const CompiledMarkdown = ({
  html,
  className,
}: CompiledMarkdownProps) => (
  <div
    className={className ?? OPENPEEPS_MARKDOWN_PROSE_CLASS}
    dangerouslySetInnerHTML={{ __html: html }}
  />
);
