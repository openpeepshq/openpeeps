import { useEffect, useState } from 'react';
import type { FeedFormat } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useResolvedFeedFormat } from '../useResolvedFeedFormat';

export const useFeedFormatPreference = () => {
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();
  const { persisted, clearSessionFormat } = useResolvedFeedFormat();
  const [format, setFormat] = useState<FeedFormat>(persisted);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormat(persisted);
  }, [persisted]);

  const save = async () => {
    if (!me) return;
    setSubmitting(true);
    try {
      await updateSettings({
        id: me.id,
        feedSettings: {
          ...settingsQuery.data?.feedSettings,
          format,
        },
      });
      clearSessionFormat();
    } finally {
      setSubmitting(false);
    }
  };

  return { me, format, setFormat, submitting, save, persisted };
};
