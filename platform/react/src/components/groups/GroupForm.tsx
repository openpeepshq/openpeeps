import type { GroupData } from '@openpeeps/common/types';
import { Input, Label, RadioSelect, Textarea } from '@openpeeps/react-ui';
import { useT } from '../../i18n';
import { useServerInfo } from '../server-data/context';
import { HeaderAvatarInput } from '../form/HeaderAvatarInput';
import {
  getGroupPostsVisibilityValue,
  getGroupVisibilityValue,
  getGroupWhoCanJoinValue,
  getGroupWhoCanPostEventsValue,
  getGroupWhoCanPostValue,
  postsVisibilityOptionsForGroup,
  setGroupPostsVisibility,
  setGroupVisibility,
  setGroupWhoCanJoin,
  setGroupWhoCanPost,
  setGroupWhoCanPostEvents,
} from '../../lib/groupCapabilityHelpers';

export interface GroupFormProps {
  groupData: GroupData;
  onChange: (data: GroupData) => void;
  isEdit?: boolean;
}

export function GroupForm({ groupData, onChange, isEdit = false }: GroupFormProps) {
  const t = useT();
  const { publicContent } = useServerInfo();

  const patch = (partial: Partial<GroupData>) =>
    onChange({ ...groupData, ...partial });

  const patchCapabilities = (
    updater: (draft: GroupData) => void,
  ) => {
    const draft = structuredClone(groupData);
    updater(draft);
    onChange(draft);
  };

  const visibilityValue = getGroupVisibilityValue(groupData.capabilities);
  const postsVisibilityValue = getGroupPostsVisibilityValue(groupData.capabilities);
  const whoCanJoinValue = getGroupWhoCanJoinValue(groupData.capabilities);
  const whoCanPostValue = getGroupWhoCanPostValue(groupData.capabilities);
  const whoCanPostEventsValue = getGroupWhoCanPostEventsValue(
    groupData.capabilities,
  );

  const visibilityOptions = ['public', 'local', 'private']
    .filter((v) => (publicContent ? true : v !== 'public'))
    .map((value) => ({
      value,
      title: t(`groups.visibility.${value}.title`, { defaultValue: value }),
      description: t(`groups.visibility.${value}.description`, {
        defaultValue: '',
      }),
    }));

  const postsVisibilityOptions = postsVisibilityOptionsForGroup(visibilityValue)
    .filter((v) => (publicContent ? true : v !== 'public'))
    .map((value) => ({
      value,
      title: t(`groups.postsVisibility.${value}.title`, { defaultValue: value }),
      description: t(`groups.postsVisibility.${value}.description`, {
        defaultValue: '',
      }),
    }));

  const whoCanJoinOptions = ['open', 'closed'].map((value) => ({
    value,
    title: t(`groups.whoCanJoin.${value}.title`, { defaultValue: value }),
    description: t(`groups.whoCanJoin.${value}.description`, {
      defaultValue: '',
    }),
  }));

  const whoCanPostOptions = ['members', 'admin'].map((value) => ({
    value,
    title: t(`groups.whoCanPost.${value}.title`, { defaultValue: value }),
    description: t(`groups.whoCanPost.${value}.description`, {
      defaultValue: '',
    }),
  }));

  const whoCanPostEventsOptions = ['members', 'admin'].map((value) => ({
    value,
    title: t(`groups.whoCanPostEvents.${value}.title`, { defaultValue: value }),
    description: t(`groups.whoCanPostEvents.${value}.description`, {
      defaultValue: '',
    }),
  }));

  return (
    <div className="space-y-4">
      <HeaderAvatarInput
        header={groupData.header ?? undefined}
        avatar={groupData.avatar ?? undefined}
        onHeaderChange={(header) => patch({ header })}
        onAvatarChange={(avatar) => patch({ avatar })}
      />

      <div className="space-y-2 px-1">
        <Label htmlFor="displayName">
          {t('groups.form.groupName', { defaultValue: 'Group name' })}
        </Label>
        <Input
          id="displayName"
          value={groupData.displayName ?? ''}
          onChange={(e) => patch({ displayName: e.target.value })}
          data-testid="groups-name-input"
        />
      </div>

      {!isEdit ? (
        <div className="space-y-2 px-1">
          <Label htmlFor="handle">
            {t('groups.handle.title', { defaultValue: 'Handle' })}
          </Label>
          <Input
            id="handle"
            value={groupData.handle ?? ''}
            placeholder={t('groups.handle.placeholder', {
              defaultValue: 'my_group',
            })}
            onChange={(e) => patch({ handle: e.target.value })}
            data-testid="groups-handle-input"
          />
        </div>
      ) : null}

      <div className="space-y-2 px-1">
        <Label htmlFor="description">
          {t('groups.description.title', { defaultValue: 'Description' })}
        </Label>
        <Textarea
          id="description"
          rows={4}
          value={groupData.description ?? ''}
          placeholder={t('groups.description.placeholder', { defaultValue: '' })}
          onChange={(e) => patch({ description: e.target.value })}
          data-testid="groups-description-input"
        />
      </div>

      <div className="space-y-2 px-1">
        <Label htmlFor="rules">
          {t('groups.rules.title', { defaultValue: 'Rules' })}
        </Label>
        <Textarea
          id="rules"
          rows={4}
          value={groupData.rules ?? ''}
          placeholder={t('groups.rules.placeholder', { defaultValue: '' })}
          onChange={(e) => patch({ rules: e.target.value })}
          data-testid="groups-rules-input"
        />
      </div>

      <RadioSelect
        title={t('groups.visibility.title', { defaultValue: 'Visibility' })}
        description={t('groups.visibility.description', { defaultValue: '' })}
        value={visibilityValue}
        options={visibilityOptions}
        onChange={(value) =>
          patchCapabilities((draft) => setGroupVisibility(draft, value))
        }
      />

      {visibilityValue !== 'private' ? (
        <RadioSelect
          title={t('groups.postsVisibility.title', {
            defaultValue: 'Posts visibility',
          })}
          description={t('groups.postsVisibility.description', {
            defaultValue: '',
          })}
          value={postsVisibilityValue}
          options={postsVisibilityOptions}
          onChange={(value) =>
            patchCapabilities((draft) => setGroupPostsVisibility(draft, value))
          }
        />
      ) : null}

      <RadioSelect
        title={t('groups.whoCanJoin.title', { defaultValue: 'Who can join' })}
        description={t('groups.whoCanJoin.description', { defaultValue: '' })}
        value={whoCanJoinValue}
        options={whoCanJoinOptions}
        onChange={(value) =>
          patchCapabilities((draft) => setGroupWhoCanJoin(draft, value))
        }
      />

      <RadioSelect
        title={t('groups.whoCanPost.title', { defaultValue: 'Who can post' })}
        description={t('groups.whoCanPost.description', { defaultValue: '' })}
        value={whoCanPostValue}
        options={whoCanPostOptions}
        onChange={(value) =>
          patchCapabilities((draft) => setGroupWhoCanPost(draft, value))
        }
      />

      {whoCanPostValue === 'members' ? (
        <RadioSelect
          title={t('groups.whoCanPostEvents.title', {
            defaultValue: 'Who can post events',
          })}
          description={t('groups.whoCanPostEvents.description', {
            defaultValue: '',
          })}
          value={whoCanPostEventsValue}
          options={whoCanPostEventsOptions}
          optionTestId={(value) =>
            value === 'admin'
              ? 'groups-who-can-post-events-moderators'
              : 'groups-who-can-post-events-members'
          }
          onChange={(value) =>
            patchCapabilities((draft) => setGroupWhoCanPostEvents(draft, value))
          }
        />
      ) : null}
    </div>
  );
}
