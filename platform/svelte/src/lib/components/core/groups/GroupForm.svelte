<script lang="ts">
  import { type GroupData, groupDataSchema } from '@openpeeps/common/types';
  import { Form, FormInput, RadioSelect } from '@openpeeps/ui';
  import { HeaderAvatarInput } from '$lib/components';
  import { i18nContext } from '$lib/components/i18n';
  import { groupCapabilityTemplates } from '@openpeeps/common/lib';
  import type { ChangeEventHandler } from 'svelte/elements';
  import { getServerInfo } from '$lib/server';

  const { t } = i18nContext();
  const { publicContent } = getServerInfo();

  interface Props {
    groupData?: GroupData;
  }

  let {
    groupData = $bindable({
      displayName: '',
      handle: '',
      capabilities: groupCapabilityTemplates.defaultGroup.capabilities,
    }),
  }: Props = $props();

  let visibilityValue = $derived(
    groupData?.capabilities?.none?.add?.includes('core-groups-read')
      ? 'public'
      : groupData?.capabilities?.local?.add?.includes('core-groups-read')
        ? 'local'
        : 'private',
  );
  let postsVisibilityValue = $derived(
    groupData?.capabilities?.none?.add?.includes('core-posts-read')
      ? 'public'
      : groupData?.capabilities?.local?.add?.includes('core-posts-read')
        ? 'local'
        : 'private',
  );
  let whoCanJoinValue = $derived(
    groupData?.capabilities?.local?.add?.includes('core-groups-join')
      ? 'open'
      : 'closed',
  );
  let whoCanPostValue = $derived(
    groupData?.capabilities?.member?.add?.includes('core-posts-create-*')
      ? 'members'
      : 'moderators',
  );
  let whoCanPostEventsValue = $derived(
    groupData?.capabilities?.member?.remove?.includes('core-posts-create-event')
      ? 'moderators'
      : 'members',
  );

  const addCapabilities = (
    capabilitiesToAdd: string[],
    capabilities: string[] = [],
  ) => [...capabilities, ...capabilitiesToAdd];
  const removeCapabilities = (
    capabilitiesToRemove: string[],
    capabilities: string[] = [],
  ) => capabilities.filter((c) => !capabilitiesToRemove.includes(c));

  const handlerShim =
    (f: (value: string) => void): ChangeEventHandler<HTMLInputElement> =>
    (e) => {
      f(e.currentTarget.value);
    };

  const setVisibility = (value: string) => {
    groupData.capabilities = {
      ...groupData.capabilities,
      none: {
        add:
          value === 'public'
            ? addCapabilities(
                ['core-groups-read'],
                groupData.capabilities.none?.add,
              )
            : removeCapabilities(
                ['core-groups-read'],
                groupData.capabilities.none?.add,
              ),
      },
      local: {
        add:
          value === 'local'
            ? addCapabilities(
                ['core-groups-read'],
                groupData.capabilities.local?.add,
              )
            : removeCapabilities(
                ['core-groups-read'],
                groupData.capabilities.local?.add,
              ),
      },
      member: {
        add:
          value === 'private'
            ? addCapabilities(
                ['core-groups-read'],
                groupData.capabilities.member?.add,
              )
            : removeCapabilities(
                ['core-groups-read'],
                groupData.capabilities.member?.add,
              ),
      },
    };
    switch (value) {
      case 'public':
        break;
      case 'local':
        if (postsVisibilityValue === 'public') {
          setPostsVisibility('local');
        }
        break;
      case 'private':
        setPostsVisibility('private');
        break;
    }
  };

  const setPostsVisibility = (value: string) => {
    groupData.capabilities = {
      ...groupData.capabilities,
      none: {
        add:
          value === 'public'
            ? addCapabilities(
                ['core-posts-read'],
                groupData.capabilities.none?.add,
              )
            : removeCapabilities(
                ['core-posts-read'],
                groupData.capabilities.none?.add,
              ),
      },
      local: {
        add:
          value === 'local'
            ? addCapabilities(
                ['core-posts-read'],
                groupData.capabilities.local?.add,
              )
            : removeCapabilities(
                ['core-posts-read'],
                groupData.capabilities.local?.add,
              ),
      },
      member: {
        add:
          value === 'private'
            ? addCapabilities(
                ['core-posts-read'],
                groupData.capabilities.member?.add,
              )
            : removeCapabilities(
                ['core-posts-read'],
                groupData.capabilities.member?.add,
              ),
      },
    };
  };

  const setWhoCanJoin = (value: string) => {
    groupData.capabilities = {
      ...groupData.capabilities,
      local: {
        add:
          value === 'open'
            ? addCapabilities(
                ['core-groups-join'],
                groupData.capabilities.local?.add,
              )
            : removeCapabilities(
                ['core-groups-join'],
                groupData.capabilities.local?.add,
              ),
      },
    };
  };

  const setWhoCanPost = (value: string) => {
    groupData.capabilities = {
      ...groupData.capabilities,
      member: {
        add:
          value === 'members'
            ? addCapabilities(
                ['core-posts-create-*'],
                groupData.capabilities.member?.add,
              )
            : removeCapabilities(
                ['core-posts-create-*'],
                groupData.capabilities.member?.add,
              ),
      },
    };
  };

  const setWhoCanPostEvents = (value: string) => {
    groupData.capabilities = {
      ...groupData.capabilities,
      member: {
        add: groupData.capabilities.member?.add,
        remove:
          value === 'moderators'
            ? addCapabilities(
                ['core-posts-create-event'],
                groupData.capabilities.member?.remove,
              )
            : removeCapabilities(
                ['core-posts-create-event'],
                groupData.capabilities.member?.remove,
              ),
      },
    };
  };

  let valid = $state(false);

  let viewPostsVisbilityOptions = $derived(
    visibilityValue === 'private'
      ? ['private']
      : visibilityValue === 'local'
        ? ['local', 'private']
        : ['public', 'local', 'private'],
  );
</script>

<Form bind:data={groupData} schema={groupDataSchema} bind:valid>
  <HeaderAvatarInput />
  <div class="flex flex-col gap-4 px-3">
    <FormInput title={t('groups.form.groupName')} path={['displayName']} />
    <FormInput
      title={t('groups.handle.title')}
      path={['handle']}
      type="handle"
      placeholder={t('groups.handle.placeholder')}
    />
    <FormInput
      type="textarea"
      title={t('groups.description.title')}
      path={['description']}
      placeholder={t('groups.description.placeholder')}
    />
    <FormInput
      type="textarea"
      title={t('groups.rules.title')}
      path={['rules']}
      placeholder={t('groups.rules.placeholder')}
    />

    <RadioSelect
      title={t('groups.visibility.title')}
      description={t('groups.visibility.description')}
      value={visibilityValue}
      options={['public', 'local', 'private']
        .filter((v) => (publicContent ? true : v !== 'public'))
        .map((value) => ({
          title: t(`groups.visibility.${value}.title`),
          value,
          description: t(`groups.visibility.${value}.description`),
        }))}
      oninput={handlerShim(setVisibility)}
    />

    {#if visibilityValue !== 'private'}
      <RadioSelect
        title={t('groups.postsVisibility.title')}
        description={t('groups.postsVisibility.description')}
        value={postsVisibilityValue}
        options={viewPostsVisbilityOptions
          .filter((v) => (publicContent ? true : v !== 'public'))
          .map((value) => ({
            title: t(`groups.postsVisibility.${value}.title`),
            value,
            description: t(`groups.postsVisibility.${value}.description`),
          }))}
        oninput={handlerShim(setPostsVisibility)}
      />
    {/if}

    <RadioSelect
      title={t('groups.whoCanJoin.title')}
      description={t('groups.whoCanJoin.description')}
      value={whoCanJoinValue}
      options={['open', 'closed'].map((value) => ({
        title: t(`groups.whoCanJoin.${value}.title`),
        value,
        description: t(`groups.whoCanJoin.${value}.description`),
      }))}
      oninput={handlerShim(setWhoCanJoin)}
    />

    <RadioSelect
      title={t('groups.whoCanPost.title')}
      description={t('groups.whoCanPost.description')}
      value={whoCanPostValue}
      options={['members', 'moderators'].map((value) => ({
        title: t(`groups.whoCanPost.${value}.title`),
        value,
        description: t(`groups.whoCanPost.${value}.description`),
      }))}
      oninput={handlerShim(setWhoCanPost)}
    />
    {#if whoCanPostValue === 'members'}
      <RadioSelect
        title={t('groups.whoCanPostEvents.title')}
        description={t('groups.whoCanPostEvents.description')}
        value={whoCanPostEventsValue}
        options={['members', 'moderators'].map((value) => ({
          title: t(`groups.whoCanPostEvents.${value}.title`),
          value,
          description: t(`groups.whoCanPostEvents.${value}.description`),
        }))}
        oninput={handlerShim(setWhoCanPostEvents)}
      />
    {/if}
  </div>
</Form>
