import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, PhoneOff } from 'lucide-react';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { AccessDeniedLoader } from '../layout/AccessDeniedLoader';
import { CardEvent } from '../post/types/event/CardEvent';
import { LivekitUnavailableNotice } from './LivekitUnavailableNotice';

export function LiveJamsSection() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const liveJamsQuery = openpeepsApi.useJams();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!liveJamsQuery.isError) return;
    console.error(
      '[openpeeps] Live jams failed to load. Community admins can diagnose LiveKit at /admin/diagnostics/livekit.',
      liveJamsQuery.error,
    );
  }, [liveJamsQuery.isError, liveJamsQuery.error]);

  return (
    <section className="mb-8">
      <button
        type="button"
        className="mb-3 flex items-center gap-3 px-1"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDown className="size-5" />
        ) : (
          <ChevronRight className="size-5" />
        )}
        <h2 className="text-lg font-semibold">
          {t('jams.liveJams', { defaultValue: 'Live jams' })}
        </h2>
      </button>

      {open ? (
        <AccessDeniedLoader
          queries={[liveJamsQuery]}
          fallbackError={
            <LivekitUnavailableNotice className="text-destructive text-sm" />
          }
        >
          {(liveJamsQuery.data ?? []).length ? (
            <div
              role="feed"
              className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4"
            >
              {(liveJamsQuery.data ?? []).map((jam) => (
                <CardEvent key={jam.id} post={jam} showEventDate={false} />
              ))}
            </div>
          ) : (
            <div className="flex h-72 w-full flex-col items-center justify-center gap-y-6">
              <PhoneOff size={60} className="text-muted-foreground" />
              <p>
                {t('jams.noLiveJams', {
                  defaultValue: 'No live jams right now',
                })}
              </p>
            </div>
          )}
        </AccessDeniedLoader>
      ) : null}
    </section>
  );
}
