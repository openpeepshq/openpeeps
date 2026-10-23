import { useState } from 'react';
import {
  HANDLE_RESERVED_MESSAGE,
  isForbiddenHandle,
  type GroupData,
  type PublicProfile,
} from '@openpeepshq/common/types';
import {
  applySimpleGroupTemplate,
  defaultSimpleGroupTemplate,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useNavigate } from '../../contexts/router';
import { useT } from '../../i18n/context';
import { useServerInfo } from '../../components/server-data/context';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import {
  duplicateHandleMessage,
  groupFormFieldErrors,
  hasGroupFormFieldErrors,
  isDuplicateHandleError,
  type GroupFormFieldErrors,
} from '../../lib/groupFormErrors';

const handleFromDisplayName = (displayName: string) =>
  displayName
    .toLowerCase()
    .replaceAll(' ', '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .trim()
    .slice(0, 16);

export const useNewGroup = () => {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const createGroup = openpeepsApi.createGroupAction();
  const serverInfo = useServerInfo();
  const { publicContent } = serverInfo;
  const additionalForbiddenHandles =
    serverInfo.communityConfig?.settings?.additionalForbiddenHandles;
  const [members, setMembers] = useState<PublicProfile[]>([]);
  const [groupData, setGroupData] = useState<GroupData>(() => ({
    displayName: '',
    handle: '',
    description: '',
    rules: '',
    capabilities: applySimpleGroupTemplate(
      defaultSimpleGroupTemplate(publicContent),
    ),
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<GroupFormFieldErrors>({});

  const submit = async () => {
    setError(null);
    const nextFieldErrors = groupFormFieldErrors(groupData, t, {
      additionalForbiddenHandles,
    });
    if (hasGroupFormFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});
    const data =
      groupData.handle.length === 0
        ? {
            ...groupData,
            handle: handleFromDisplayName(groupData.displayName!),
          }
        : groupData;
    if (isForbiddenHandle(data.handle, additionalForbiddenHandles)) {
      const msg = t('profile.form.handleReserved', {
        defaultValue: 'That handle is reserved. Please choose another.',
      });
      setFieldErrors({ handle: msg });
      return;
    }
    setSubmitting(true);
    try {
      const group = (await createGroup({ ...data, members })) as {
        handle: string;
      };
      navigate({ type: 'group', handle: group.handle });
    } catch (err) {
      if ((err as Error).message === HANDLE_RESERVED_MESSAGE) {
        const msg = t('profile.form.handleReserved', {
          defaultValue: 'That handle is reserved. Please choose another.',
        });
        setFieldErrors({ handle: msg });
        setError(msg);
        return;
      }
      if (isDuplicateHandleError(err)) {
        const msg = duplicateHandleMessage(t);
        setFieldErrors({ handle: msg });
        setError(msg);
        return;
      }
      setError(
        apiErrorMessage(
          err,
          t,
          t('groups.create.error', { defaultValue: 'Failed to create group' }),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    groupData,
    setGroupData,
    members,
    setMembers,
    submitting,
    error,
    clearError: () => setError(null),
    fieldErrors,
    submit,
  };
};
