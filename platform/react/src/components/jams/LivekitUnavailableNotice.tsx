import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { useCanDiagnoseLivekit } from '../../hooks/jams/useCanDiagnoseLivekit';

export const LIVEKIT_DIAGNOSTICS_PATH = '/admin/diagnostics/livekit';

const consoleWarning =
  '[openpeeps] Jams cannot reach LiveKit. Community admins can diagnose this at /admin/diagnostics/livekit.';

/**
 * Shown when live jams are off or the live list fails. Logs a console warning
 * so the misconfiguration is visible without opening the admin area.
 */
export const LivekitUnavailableNotice = ({
  className = 'text-destructive text-sm',
}: {
  className?: string;
}) => {
  const t = useT();
  const canDiagnose = useCanDiagnoseLivekit();

  useEffect(() => {
    console.warn(consoleWarning);
  }, []);

  return (
    <p role="status" className={className}>
      {t('jams.unavailable.message', {
        defaultValue: 'Jams are unavailable because LiveKit is not connected.',
      })}
      {canDiagnose ? (
        <>
          {' '}
          <Link
            to={LIVEKIT_DIAGNOSTICS_PATH}
            className="text-primary underline"
          >
            {t('jams.unavailable.diagnose', {
              defaultValue: 'Diagnose LiveKit',
            })}
          </Link>
        </>
      ) : null}
    </p>
  );
};
