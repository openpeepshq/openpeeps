import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { visibleTextLength } from '@openpeepshq/common';
import { useT } from '../../../i18n';
import { nextRichMarkdownValue } from './richMarkdownValue';
import type { RichMarkdownEditorHandle } from './RichMarkdownEditor';

const RichMarkdownEditor = lazy(() =>
  import('./RichMarkdownEditor').then((module) => ({
    default: module.RichMarkdownEditor,
  })),
);

export interface OpenpeepsRichMarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Character budget; the counter turns red once exceeded. Defaults to 10000
   * as a safety net for future callers: every shipped long-form page
   * (Article/Event/Resource) and CommunityMarkdownPage passes its own budget
   * explicitly, and the short post and message composers pass
   * `POST_MAX_VISIBLE_LENGTH` (500).
   */
  maxLength?: number;
  placeholder?: string;
  /** Extra classes for the editing surface. */
  className?: string;
  testId?: string;
  /** Shorter writing surface for posts and messages. */
  compact?: boolean;
}

export const OpenpeepsRichMarkdownInput = ({
  value,
  onChange,
  maxLength = 10000,
  placeholder,
  className,
  testId,
  compact = false,
}: OpenpeepsRichMarkdownInputProps) => {
  const t = useT();
  const editorRef = useRef<RichMarkdownEditorHandle>(null);
  const acceptedRef = useRef(value);
  const [parseError, setParseError] = useState(false);

  // The editor reads `markdown` only on mount. A later parent update (loaded
  // article, discarded draft) has to be pushed in through the ref.
  useEffect(() => {
    if (value === acceptedRef.current) return;
    acceptedRef.current = value;
    editorRef.current?.setMarkdown(value);
  }, [value]);

  const handleChange = (next: string, initialNormalize: boolean) => {
    const accepted = nextRichMarkdownValue(
      acceptedRef.current,
      next,
      maxLength,
      initialNormalize,
    );
    if (accepted === null) {
      if (!initialNormalize && next !== acceptedRef.current) {
        editorRef.current?.setMarkdown(acceptedRef.current);
      }
      return;
    }
    acceptedRef.current = accepted;
    // mdxeditor only calls this with content it parsed, so an accepted change
    // means any earlier parse error is cleared.
    setParseError(false);
    onChange(accepted);
  };

  // The plain input counts raw length when `blockOverflow` is on, so the
  // counter can jump when toggling modes — an accepted divergence.
  const overLimit = visibleTextLength(value) > maxLength;

  return (
    <div className="w-full">
      <div className="pb-2">
        <a
          href="/docs/user/markdown"
          target="_blank"
          rel="noopener noreferrer"
          className="op-anchor text-sm"
        >
          {t('form.markdownHelp', { defaultValue: 'Formatting help' })}
        </a>
      </div>
      <Suspense
        fallback={
          <div
            className={
              compact
                ? 'border-border text-muted-foreground flex min-h-24 items-center justify-center rounded-md border text-sm'
                : 'border-border text-muted-foreground flex min-h-96 items-center justify-center rounded-md border text-sm'
            }
          >
            {t('common.form.loading', { defaultValue: 'Loading…' })}
          </div>
        }
      >
        <RichMarkdownEditor
          ref={editorRef}
          value={value}
          className={className}
          placeholder={placeholder}
          testId={testId}
          compact={compact}
          onChange={handleChange}
          onParseError={() => setParseError(true)}
        />
      </Suspense>
      {parseError ? (
        <p className="text-error pt-2 text-sm">
          {t('form.richMarkdown.parseError', {
            defaultValue:
              'This content could not be shown in the visual editor. Use source mode to keep editing it.',
          })}
        </p>
      ) : null}
      <div className="w-full px-2 text-right text-sm">
        <span className={overLimit ? 'text-error' : undefined}>
          {visibleTextLength(value)}
        </span>{' '}
        / {maxLength}
      </div>
    </div>
  );
};
