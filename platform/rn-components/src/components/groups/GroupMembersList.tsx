import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GroupMember, GroupWithMeta } from '@openpeepshq/common/types';
import {
  canChangeMemberRole,
  canRemoveMember,
  matchesQuery,
  sortGroupMembers,
  truncateText,
} from '@openpeepshq/common/lib';
import { useCurrentProfile, useOpenpeeps } from '@openpeepshq/react';
import { useCreateNewConversation } from '~/components/conversations/CreateNewConversationContext';
import {
  MessageSquareTextIcon,
  MoreHorizontalIcon,
  UserCogIcon,
  UserMinusIcon,
} from '~/components/icons';
import { MainStackParamList } from '~/components/navigation/types';
import { ProfileAvatar } from '~/components/profile/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Input } from '~/components/ui/input';
import { ThemedText } from '~/components/ui/themed-text';
import { ChangeGroupRolesModal } from './ChangeGroupRolesModal';
import { ConfirmMemberRemovalModal } from './ConfirmMemberRemovalModal';

export interface GroupMembersListProps {
  group: GroupWithMeta;
}

type ActiveModal =
  | { type: 'roles'; member: GroupMember }
  | { type: 'remove'; member: GroupMember }
  | null;

export const GroupMembersList = ({ group }: GroupMembersListProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { openCreateConversation } = useCreateNewConversation();
  const membersQuery = openpeepsApi.useGroupMembers(group.id);
  const [search, setSearch] = useState('');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const members = useMemo(
    () => sortGroupMembers(membersQuery.data ?? []),
    [membersQuery.data]
  );
  const filtered = useMemo(
    () =>
      members.filter(
        (member) => !search || matchesQuery(member.profile, search)
      ),
    [members, search]
  );

  if (membersQuery.isLoading) return <ActivityIndicator size="small" />;

  return (
    <View className="flex-col">
      <View className="p-4">
        <Input
          placeholder={t('groups.members.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {filtered.map((member) => (
        <View
          key={member.profile.id}
          className="flex-row items-center justify-between gap-3 border-b border-border p-4"
        >
          <Pressable
            className="min-w-0 flex-1 flex-row items-center gap-3 rounded-md"
            onPress={() =>
              navigation.navigate('Profile', { handle: member.profile.handle })
            }
          >
            <ProfileAvatar profile={member.profile} className="size-12" />
            <View className="min-w-0 flex-col">
              <ThemedText className="text-sm font-semibold">
                {member.profile.displayName || `@${member.profile.handle}`}
              </ThemedText>
              <ThemedText className="text-xs text-muted-foreground">
                @{member.profile.handle}
              </ThemedText>
              {member.roles?.length ? (
                <View className="mt-1 flex-row flex-wrap gap-1">
                  {member.roles.map((role) => (
                    <View
                      key={role}
                      className="rounded bg-primary/10 px-1.5 py-0.5"
                    >
                      <ThemedText className="text-xs uppercase text-primary">
                        {t(`groups.roles.${role}`, { defaultValue: role })}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </Pressable>

          {me?.id !== member.profile.id ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Pressable className="items-center justify-center p-3">
                  <MoreHorizontalIcon size={16} className="text-foreground" />
                </Pressable>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-1">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="flex-row items-center gap-x-2"
                    onPress={() =>
                      openCreateConversation({
                        profiles: [member.profile],
                        skipProfileSelection: true,
                      })
                    }
                  >
                    <MessageSquareTextIcon
                      size={16}
                      className="text-foreground"
                    />
                    <ThemedText>
                      {t('conversations.newMessage', {
                        defaultValue: `Message @${truncateText(member.profile.handle, 10)}`,
                        handle: truncateText(member.profile.handle, 10),
                      })}
                    </ThemedText>
                  </DropdownMenuItem>
                  {me && canChangeMemberRole(me, group) ? (
                    <DropdownMenuItem
                      className="flex-row items-center gap-x-2"
                      onPress={() => setActiveModal({ type: 'roles', member })}
                    >
                      <UserCogIcon size={16} className="text-foreground" />
                      <ThemedText>{t('groups.changeRoles.title')}</ThemedText>
                    </DropdownMenuItem>
                  ) : null}
                  {me && canRemoveMember(me, group) ? (
                    <DropdownMenuItem
                      className="flex-row items-center gap-x-2"
                      onPress={() => setActiveModal({ type: 'remove', member })}
                    >
                      <UserMinusIcon size={16} className="text-destructive" />
                      <ThemedText className="text-destructive">
                        {t('groups.actions.removeFromGroup')}
                      </ThemedText>
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </View>
      ))}
      {filtered.length === 0 ? (
        <View className="w-full items-center justify-center p-4">
          <ThemedText className="text-sm text-muted-foreground">
            {t('groups.members.empty')}
          </ThemedText>
        </View>
      ) : null}

      {activeModal?.type === 'roles' ? (
        <ChangeGroupRolesModal
          group={group}
          member={activeModal.member}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal?.type === 'remove' ? (
        <ConfirmMemberRemovalModal
          group={group}
          profile={activeModal.member.profile}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </View>
  );
};
