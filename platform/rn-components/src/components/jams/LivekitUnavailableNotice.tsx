import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCanDiagnoseLivekit } from '@openpeepshq/react';
import { ThemedText } from '../ui/themed-text';

const consoleWarning =
  '[openpeeps] Jams cannot reach LiveKit. Community admins can diagnose this at /admin/diagnostics/livekit.';

export const LivekitUnavailableNotice = ({
  className = 'text-sm text-destructive',
}: {
  className?: string;
}) => {
  const { t } = useTranslation();
  const canDiagnose = useCanDiagnoseLivekit();

  useEffect(() => {
    console.warn(consoleWarning);
  }, []);

  return (
    <ThemedText className={className}>
      {t('jams.unavailable.message')}
      {canDiagnose ? ` ${t('jams.unavailable.diagnoseHint')}` : ''}
    </ThemedText>
  );
};
