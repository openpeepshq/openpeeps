<script lang="ts">
  import { updateRoleMutation } from '@openpeeps/svelte/api';
  import { Button, Label } from '@openpeeps/ui';
  import { getToastStore, SlideToggle } from '@skeletonlabs/skeleton';
  import { toast } from '$lib/utils';
  import { i18nContext } from '$lib/components';
  import type { Role } from '@openpeeps/common';

  const { t } = i18nContext();

  const updateRole = updateRoleMutation();

  const toastStore = getToastStore();

  interface Props {
    roles: Role[];
  }

  const { roles }: Props = $props();

  const memberRole: Role = roles.find((role) => role.key === 'member')!;

  let membersCanCreateEvents = $state(
    memberRole?.capabilities?.add?.includes('core-posts-create-*'),
  );

  let membersCanCreateGroups = $state(
    memberRole?.capabilities?.add?.includes('core-groups-create'),
  );

  const adjustCapabilities = (capabilities: string[]) => {
    let adjustedCapabilities = [...capabilities];

    if (
      membersCanCreateGroups &&
      !adjustedCapabilities.includes('core-groups-create')
    ) {
      adjustedCapabilities = [...adjustedCapabilities, 'core-groups-create'];
    }
    if (!membersCanCreateGroups) {
      adjustedCapabilities = adjustedCapabilities.filter(
        (capability) => capability !== 'core-groups-create',
      );
    }
    if (membersCanCreateEvents) {
      adjustedCapabilities = adjustedCapabilities.filter(
        (capability) =>
          capability !== 'core-posts-create-note-*' &&
          capability !== 'core-posts-create-question-*' &&
          capability !== 'core-posts-create-article-*',
      );
      if (!adjustedCapabilities.includes('core-posts-create-*')) {
        adjustedCapabilities = [...adjustedCapabilities, 'core-posts-create-*'];
      }
    }
    if (!membersCanCreateEvents) {
      adjustedCapabilities = adjustedCapabilities.filter(
        (capability) => capability !== 'core-posts-create-*',
      );
      if (!adjustedCapabilities.includes('core-posts-create-note-*')) {
        adjustedCapabilities = [
          ...adjustedCapabilities,
          'core-posts-create-note-*',
        ];
      }
      if (!adjustedCapabilities.includes('core-posts-create-question-*')) {
        adjustedCapabilities = [
          ...adjustedCapabilities,
          'core-posts-create-question-*',
        ];
      }
      if (!adjustedCapabilities.includes('core-posts-create-article-*')) {
        adjustedCapabilities = [
          ...adjustedCapabilities,
          'core-posts-create-article-*',
        ];
      }
    }
    return adjustedCapabilities;
  };

  const action = async () => {
    await updateRole(
      {
        ...memberRole,
        default: false,
        capabilities: {
          add: adjustCapabilities(memberRole?.capabilities?.add ?? []),
        },
      },
      {
        roleId: memberRole?.id,
      },
    ).then(() => {
      toastStore.trigger(
        toast({
          message: t(
            'admin.configuration.community.roleConfigurationSimple.success',
          ),
          background: 'variant-filled-success',
        }),
      );
    });
  };
</script>

<div class="flex flex-col gap-4 p-4">
  <h3 class="h3">
    {t('admin.configuration.community.roleConfigurationSimple.title')}
  </h3>
  <Label
    title={t(
      'admin.configuration.community.roleConfigurationSimple.membersCanCreateEvents.title',
    )}
    description={t(
      'admin.configuration.community.roleConfigurationSimple.membersCanCreateEvents.description',
    )}
  >
    <SlideToggle
      name="slide"
      bind:checked={membersCanCreateEvents}
      background="bg-surface-300"
      active="bg-primary-500"
    />
  </Label>

  <Label
    title={t(
      'admin.configuration.community.roleConfigurationSimple.membersCanCreateGroups.title',
    )}
    description={t(
      'admin.configuration.community.roleConfigurationSimple.membersCanCreateGroups.description',
    )}
  >
    <SlideToggle
      name="slide"
      bind:checked={membersCanCreateGroups}
      background="bg-surface-300"
      active="bg-primary-500"
    />
  </Label>

  <Button variant="variant-ghost-primary" {action}>Save</Button>
</div>
