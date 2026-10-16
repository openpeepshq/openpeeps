import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Button } from '@openpeepshq/react-ui';
import type { LivekitDiagnosis } from '@openpeepshq/common/types';

const checkLabelKey = {
  url: 'diagnostics.livekit.url',
  apiKey: 'diagnostics.livekit.apiKey',
  apiSecret: 'diagnostics.livekit.apiSecret',
  reachable: 'diagnostics.livekit.reachable',
} as const;

export const AdminDiagnosticsLivekit = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const diagnosisQuery = openpeepsApi.admin.useLivekitDiagnosis();

  useSetPageHeader(t('diagnostics.livekit.title', { defaultValue: 'LiveKit' }));

  const diagnosis = diagnosisQuery.data;

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground text-sm">
        {t('diagnostics.livekit.description', {
          defaultValue:
            'Check whether jams can reach the LiveKit server. Missing or invalid credentials disable live jams.',
        })}
      </p>

      <Button
        variant="outline"
        title={t('diagnostics.livekit.refresh', { defaultValue: 'Refresh' })}
        action={() => void diagnosisQuery.refetch()}
      >
        {t('diagnostics.livekit.refresh', { defaultValue: 'Refresh' })}
      </Button>

      {diagnosisQuery.isPending ? (
        <p className="text-muted-foreground text-sm">
          {t('common.form.loading', { defaultValue: 'Loading…' })}
        </p>
      ) : null}

      {diagnosisQuery.isError ? (
        <p className="text-error text-sm">
          {t('diagnostics.livekit.loadError', {
            defaultValue: 'Could not load the LiveKit diagnosis.',
          })}
        </p>
      ) : null}

      {diagnosis ? <DiagnosisReport diagnosis={diagnosis} /> : null}
    </div>
  );
};

const DiagnosisReport = ({ diagnosis }: { diagnosis: LivekitDiagnosis }) => {
  const t = useT();

  return (
    <div className="space-y-4">
      <p
        className={`font-medium ${diagnosis.connected ? 'text-success' : 'text-error'}`}
        role="status"
      >
        {diagnosis.connected
          ? t('diagnostics.livekit.connected', { defaultValue: 'Connected' })
          : t('diagnostics.livekit.notConnected', {
              defaultValue: 'Not connected',
            })}
      </p>

      <ul className="border-border divide-border divide-y rounded-md border">
        {diagnosis.checks.map((check) => {
          const status =
            check.id === 'reachable'
              ? check.ok
                ? t('diagnostics.livekit.ok', { defaultValue: 'OK' })
                : t('diagnostics.livekit.failed', { defaultValue: 'Failed' })
              : check.ok
                ? t('diagnostics.livekit.set', { defaultValue: 'Set' })
                : t('diagnostics.livekit.missing', {
                    defaultValue: 'Missing',
                  });
          return (
            <li
              key={check.id}
              className="flex items-start justify-between gap-4 p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {t(checkLabelKey[check.id], {
                    defaultValue: check.id,
                  })}
                </p>
                {check.id === 'url' && diagnosis.url ? (
                  <p className="text-muted-foreground font-mono text-xs">
                    {diagnosis.url}
                  </p>
                ) : null}
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${check.ok ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}
              >
                {status}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-sm">
        {t('diagnostics.livekit.recording', { defaultValue: 'Recording' })}
        {': '}
        <strong>
          {diagnosis.recordingEnabled
            ? t('diagnostics.livekit.recordingOn', {
                defaultValue: 'Enabled',
              })
            : t('diagnostics.livekit.recordingOff', {
                defaultValue: 'Disabled',
              })}
        </strong>
      </p>

      {diagnosis.error ? (
        <div>
          <p className="font-medium">
            {t('diagnostics.livekit.error', { defaultValue: 'Last error' })}
          </p>
          <pre className="bg-surface mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-md p-3 font-mono text-xs">
            {diagnosis.error}
          </pre>
        </div>
      ) : null}

      {!diagnosis.connected ? (
        <p className="text-muted-foreground text-sm">
          {t('diagnostics.livekit.envHint', {
            defaultValue:
              'Set JAMS_LIVEKIT_URL, JAMS_LIVEKIT_API_KEY, and JAMS_LIVEKIT_API_SECRET on the server, then refresh.',
          })}
        </p>
      ) : null}
    </div>
  );
};
