import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { useCanDiagnoseLivekit } from '../../hooks/jams/useCanDiagnoseLivekit';

export const LIVEKIT_DIAGNOSTICS_PATH = '/admin/diagnostics/livekit';

/**
 * Shown when live jams are off or the live list fails. Only admins who can open
 * Diagnostics get a link to the LiveKit diagnosis page; others just see the
 * message (the failure itself is logged where the query is consumed).
 */
export const LivekitUnavailableNotice = ({
  className = 'text-destructive text-sm',
}: {
  className?: string;
}) => {
  const t = useT();
  const canDiagnose = useCanDiagnoseLivekit();

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
