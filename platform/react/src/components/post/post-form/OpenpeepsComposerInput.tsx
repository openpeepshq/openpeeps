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
 * The toggle shares the markdown contract, but `rows`, `blockOverflow`,
 * `previewButton` and `className` are markdown-mode-only: the textarea
 * consumes them, while rich mode forwards just `value`, `onChange`,
 * `maxLength`, `placeholder` and `testId` to the visual editor. The prop
 * type stays `OpenpeepsMarkdownInputProps`, so those four props remain
 * present in the type while they are ignored in rich mode.
 *
 * Note and question editors do not use this component: they render the visual
 * editor directly (its toolbar already carries a rich-text / source switch, so
 * a second external toggle would be redundant).
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
