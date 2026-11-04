import { useState } from 'react';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import type { OpenpeepsMarkdownInputProps } from './OpenpeepsMarkdownInput';
import { OpenpeepsRichMarkdownInput } from './OpenpeepsRichMarkdownInput';

const PLAIN_MAX_LENGTH = 500;

/**
 * Posts and messages keep the textarea (mentions, preview) and can switch to
 * the visual editor. Both write the same markdown string.
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
          maxLength={props.maxLength ?? PLAIN_MAX_LENGTH}
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
