import { useT, useOpenpeeps, useSetPageHeader } from '../../index';

const rows = [
  'embedding',
  'transcription',
  'sentiment',
  'language',
  'rag',
  'topics',
] as const;

export const AdminDiagnosticsAi = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const probeQuery = openpeepsApi.admin.useAiProbe();

  useSetPageHeader(t('diagnostics.ai.title', { defaultValue: 'AI' }));

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground text-sm">
        {t('diagnostics.ai.description', {
          defaultValue:
            'Whether chat, embedding, transcription, and sentiment probes passed in this process.',
        })}
      </p>
      {probeQuery.isError ? (
        <p className="text-destructive text-sm">
          {t('diagnostics.ai.loadError', {
            defaultValue: 'Could not load the AI probe.',
          })}
        </p>
      ) : (
        <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
          {rows.map((row) => (
            <div key={row} className="contents">
              <dt>{t(`diagnostics.ai.${row}`, { defaultValue: row })}</dt>
              <dd className="font-medium">{probeQuery.data?.[row] ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
