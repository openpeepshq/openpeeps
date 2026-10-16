import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCanDiagnoseLivekit } from '@openpeepshq/react';
import { ThemedText } from '../ui/themed-text';

/**
 * Shown when live jams are off or the live list fails. Native has no in-app
 * admin shell, so admins who can diagnose see a hint pointing at the web
 * diagnostics page rather than a dead link.
 */
export const LivekitUnavailableNotice = ({
  className = 'text-sm text-destructive',
}: {
  className?: string;
}) => {
  const { t } = useTranslation();
  const canDiagnose = useCanDiagnoseLivekit();

  return (
    <ThemedText className={className}>
      {t('jams.unavailable.message')}
      {canDiagnose ? ` ${t('jams.unavailable.diagnoseHint')}` : ''}
    </ThemedText>
  );
};
