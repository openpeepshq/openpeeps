import { useState } from 'react';
import { POST_MAX_VISIBLE_LENGTH } from '@openpeepshq/common';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import type { OpenpeepsMarkdownInputProps } from './OpenpeepsMarkdownInput';
import { OpenpeepsRichMarkdownInput } from './OpenpeepsRichMarkdownInput';

/**
 * Posts and messages keep the textarea (mentions, preview) and can switch to
 * the visual editor. Both write the same markdown string.
 *
 * The toggle shares the markdown contract, but only the textarea consumes
 * `rows`, `blockOverflow`, `previewButton` and `className`; rich mode forwards
 * `value`, `onChange`, `maxLength`, `placeholder`, `testId` and `compact` to
 * the visual editor. Passing the other props in rich mode is harmless but
 * ignored.
 */
export const OpenpeepsComposerInput = (props: OpenpeepsMarkdownInputProps) => {
  const t = useT();
  const [rich, setRich] = useState(false);
  const markdownLabel = t('form.composerMode.markdown', {
    defaultValue: 'Markdown',
  });
  const richLabel = t('form.composerMode.richText', {
    defaultValue: 'Rich text',
  });

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 pb-2" role="group">
        <Button
          compact
          variant={rich ? 'outline' : 'default'}
          aria-pressed={!rich}
          action={() => setRich(false)}
        >
          {markdownLabel}
        </Button>
        <Button
          compact
          variant={rich ? 'default' : 'outline'}
          aria-pressed={rich}
          action={() => setRich(true)}
        >
          {richLabel}
        </Button>
      </div>
      {rich ? (
        <OpenpeepsRichMarkdownInput
          value={props.value}
          onChange={props.onChange}
          maxLength={props.maxLength ?? POST_MAX_VISIBLE_LENGTH}
          placeholder={props.placeholder}
          testId={props.testId}
          compact
        />
      ) : (
        <OpenpeepsMarkdownInput {...props} />
      )}
    </div>
  );
};
