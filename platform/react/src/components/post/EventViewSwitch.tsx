import { cn } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { EVENT_VIEW_OPTIONS, useEventView } from '../../stores/eventView';

export const EventViewSwitch = () => {
  const t = useT();
  const { view, setView } = useEventView();

  return (
    <div
      role="group"
      aria-label={t('events.feed.view.switchLabel', {
        defaultValue: 'Event layout',
      })}
      className="mb-3 flex justify-end"
    >
      <div className="border-border inline-flex overflow-hidden rounded-md border text-sm">
        {EVENT_VIEW_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            data-testid={`event-view-${option}`}
            className={cn(
              'px-3 py-1',
              view === option
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setView(option)}
          >
            {t(`events.feed.view.${option}`, {
              defaultValue: option === 'list' ? 'List' : 'Calendar',
            })}
          </button>
        ))}
      </div>
    </div>
  );
};
