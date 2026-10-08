import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  GroupMember,
  GroupRelationship,
  GroupWithMeta,
} from '@openpeepshq/common/types';
import {
  actorIsGroupOwner,
  assignableGroupRoles,
} from '@openpeepshq/common/lib';
import { useCurrentProfile, useOpenpeeps } from '@openpeepshq/react';
import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';
import { ThemedText } from '~/components/ui/themed-text';
import { useControlledSheet } from '~/hooks/use-controlled-sheet';
import { BaseSheet, SheetFooter } from '../custom/modals/common';

export interface ChangeGroupRolesModalProps {
  group: GroupWithMeta;
  member: GroupMember;
  onClose: () => void;
}

export const ChangeGroupRolesModal = ({
  group,
  member,
  onClose,
}: ChangeGroupRolesModalProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const setMemberRoles = openpeepsApi.setGroupMemberRolesAction({
    id: group.id,
    memberId: member.profile.id,
  });
  const ref = useControlledSheet(true);
  const actorIsOwner = me ? actorIsGroupOwner(me, group.id) : false;
  const visibleRoles = assignableGroupRoles(actorIsOwner);
  const memberIsOwner = (member.roles ?? []).includes('owner');

  const [roles, setRoles] = useState<Set<GroupRelationship>>(
    () => new Set(member.roles ?? [])
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (role: GroupRelationship, checked: boolean) => {
    setRoles((prev) => {
      const next = new Set(prev);
      if (checked) next.add(role);
      else next.delete(role);
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const nextRoles = [...roles];
      if (memberIsOwner && !actorIsOwner && !nextRoles.includes('owner')) {
        nextRoles.push('owner');
      }
      await setMemberRoles({ roles: nextRoles });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseSheet ref={ref} onDismiss={onClose}>
      <View className="flex-1 p-4">
        <ThemedText className="mb-2 text-center text-xl font-semibold">
          {t('groups.changeRoles.title')}
        </ThemedText>
        <ThemedText className="mb-6 text-center text-base text-muted-foreground">
          {t('groups.changeRoles.description', {
            handle: member.profile.handle,
          })}
        </ThemedText>
        <View className="gap-3 px-1">
          {visibleRoles.map((role) => (
            <View
              key={role}
              className="flex-row items-center justify-between gap-4"
            >
              <Label
                nativeID={`role-${role}`}
                className="text-base font-medium"
              >
                {t(`groups.roles.${role}`, { defaultValue: role })}
              </Label>
              <Checkbox
                aria-labelledby={`role-${role}`}
                checked={roles.has(role)}
                onCheckedChange={(checked) => toggleRole(role, checked)}
              />
            </View>
          ))}
        </View>
        {error ? (
          <ThemedText className="mt-4 text-center text-sm text-destructive">
            {error}
          </ThemedText>
        ) : null}
        <SheetFooter
          onCancel={onClose}
          cancelText={t('common.cancel')}
          onConfirm={() => void submit()}
          confirmText={t('groups.changeRoles.confirm')}
          disabled={submitting}
        />
      </View>
    </BaseSheet>
  );
};
