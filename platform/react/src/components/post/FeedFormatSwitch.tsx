import { FEED_FORMAT_OPTIONS, type FeedFormat } from '@openpeepshq/common';
import { cn } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useResolvedFeedFormat } from '../../hooks/useResolvedFeedFormat';

export const FeedFormatSwitch = () => {
  const t = useT();
  const { format, setSessionFormat } = useResolvedFeedFormat();

  return (
    <div
      role="group"
      aria-label={t('feed.format.switchLabel', {
        defaultValue: 'Feed layout',
      })}
      className="flex justify-end px-3 py-2"
    >
      <div className="border-border inline-flex overflow-hidden rounded-md border text-sm">
        {FEED_FORMAT_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={format === option}
            className={cn(
              'px-3 py-1',
              format === option
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setSessionFormat(option as FeedFormat)}
          >
            {t(`feed.format.${option}`, {
              defaultValue: option === 'threaded' ? 'Threaded' : 'Linear',
            })}
          </button>
        ))}
      </div>
    </div>
  );
};
