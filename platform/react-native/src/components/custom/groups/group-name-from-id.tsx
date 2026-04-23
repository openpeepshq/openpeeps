import React from 'react';
import { useOpenpeeps } from '@openpeeps/react';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../../ui/themed-text';

export const GroupNameFromId = ({ groupId }: { groupId: string }) => {
    const { openpeepsApi } = useOpenpeeps();
    const { data: group } = openpeepsApi.useGroup(groupId);
    const { t } = useTranslation();
    return <ThemedText>{group ? group.displayName || `@${group?.handle}` : t('common.form.loading')}</ThemedText>;
};
