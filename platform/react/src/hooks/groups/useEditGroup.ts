import { useEffect, useState } from 'react';
import type { GroupData } from '@openpeepshq/common/types';
import { checkGroupCapabilities } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useNavigate } from '../../contexts/router';
import { useT } from '../../i18n/context';
import { useAuthData } from '../../components/layout/IdentityContext';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import {
  groupFormFieldErrors,
  hasGroupFormFieldErrors,
  type GroupFormFieldErrors,
} from '../../lib/groupFormErrors';

export type UseEditGroupOptions = {
  /** `info` validates display name before saving; `roles` saves as-is. */
  section: 'info' | 'roles';
};

/** Loads a group by handle and saves edits, navigating back to the group. */
export const useEditGroup = (
  handle: string,
  { section }: UseEditGroupOptions,
) => {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const authData = useAuthData();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const updateGroup = openpeepsApi.updateGroupAction();

  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<GroupFormFieldErrors>({});

  useEffect(() => {
    if (groupQuery.data) {
      const {
        handle: groupHandle,
        avatar,
        header,
        displayName,
        description,
        rules,
        capabilities,
      } = groupQuery.data;
      setGroupData({
        handle: groupHandle,
        avatar,
        header,
        displayName,
        description,
        rules,
        capabilities,
      });
    }
  }, [groupQuery.data]);

  const group = groupQuery.data;
  const canEdit =
    !!group &&
    checkGroupCapabilities(authData, ['core-groups-update'], group).success;
  const canEditCapabilities =
    !!group &&
    checkGroupCapabilities(authData, ['core-groups-updateCapabilities'], group)
      .success;

  const submit = async () => {
    if (!group || !groupData) return;
    setError(null);
    if (section === 'info') {
      const nextFieldErrors = groupFormFieldErrors(groupData, t, {
        skipHandle: true,
      });
      if (hasGroupFormFieldErrors(nextFieldErrors)) {
        setFieldErrors(nextFieldErrors);
        return;
      }
      setFieldErrors({});
    }
    setSubmitting(true);
    try {
      const updated = (await updateGroup(
        { ...group, ...groupData },
        { id: group.id },
      )) as { handle: string };
      navigate({ type: 'group', handle: updated.handle });
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    groupQuery,
    group,
    groupData,
    setGroupData,
    submitting,
    error,
    clearError: () => setError(null),
    fieldErrors,
    canEdit,
    canEditCapabilities,
    submit,
  };
};
