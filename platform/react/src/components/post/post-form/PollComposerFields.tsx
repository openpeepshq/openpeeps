import { Button, Input, Label } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';

export interface PollComposerFieldsProps {
  options: string[];
  onOptionsChange: (options: string[]) => void;
  expiresAt: string;
  onExpiresAtChange: (value: string) => void;
  multiple?: boolean;
  onMultipleChange?: (value: boolean) => void;
  votersVisible?: boolean;
  onVotersVisibleChange?: (value: boolean) => void;
}

/** Shared poll option + settings fields used in compose and edit flows. */
export function PollComposerFields({
  options,
  onOptionsChange,
  expiresAt,
  onExpiresAtChange,
  multiple = false,
  onMultipleChange,
  votersVisible = false,
  onVotersVisibleChange,
}: PollComposerFieldsProps) {
  const t = useT();

  return (
    <div className="space-y-2">
      {options.map((opt, index) => (
        <Input
          key={index}
          value={opt}
          placeholder={t('posts.form.poll.optionPlaceholder', {
            defaultValue: 'Option {{n}}',
            n: index + 1,
          })}
          data-testid={`posts-poll-option-${index + 1}`}
          onChange={(e) => {
            const next = [...options];
            next[index] = e.target.value;
            onOptionsChange(next);
          }}
        />
      ))}
      {options.length < 6 ? (
        <Button
          variant="ghost"
          action={() => onOptionsChange([...options, ''])}
        >
          {t('posts.form.poll.addOption', { defaultValue: 'Add option' })}
        </Button>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="poll-expires">
          {t('posts.form.poll.expiresAt', { defaultValue: 'Expires at' })}
        </Label>
        <Input
          id="poll-expires"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => onExpiresAtChange(e.target.value)}
        />
      </div>
      {onMultipleChange ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={multiple}
            onChange={(e) => onMultipleChange(e.target.checked)}
          />
          <span>
            {t('posts.form.poll.multipleAnswers', {
              defaultValue: 'Allow multiple answers',
            })}
          </span>
        </label>
      ) : null}
      {onVotersVisibleChange ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={votersVisible}
            onChange={(e) => onVotersVisibleChange(e.target.checked)}
          />
          <span>
            {t('posts.form.poll.seeWhoVotedTitle', {
              defaultValue: 'Show who voted',
            })}
          </span>
        </label>
      ) : null}
    </div>
  );
}
