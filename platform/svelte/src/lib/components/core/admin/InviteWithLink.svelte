<script lang="ts">
  import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '$lib/utils/toast';
  import { Button } from '@openpeeps/ui';
  import { Copy } from 'lucide-svelte';
  import { ModalHeader, ModalWrapper } from '@openpeeps/ui';
  import {
    createInviteMutation,
    deactivateInviteLinkMutation,
    activateInviteLinkMutation,
    me,
  } from '$lib/api';
  import { randomString } from '@openpeeps/common/lib';
  import { parse, end } from 'iso8601-duration';
  import { truncateText } from '@openpeeps/common/lib';
  import type { GroupWithMeta, InviteLink } from '@openpeeps/common/types';
  import { i18nContext } from '$lib/components/i18n';
  import { GroupSelector } from '$lib/components/core/groups';
  import { canAddMember } from '@openpeeps/common/lib';

  const { t } = i18nContext();

  // ------------ STORES --------------
  const toastStore = getToastStore();
  const modalStore = getModalStore();
  const createInviteLink = createInviteMutation();
  let inviteLink: InviteLink | undefined = $state(undefined);
  let numberOfUses = $state('1');
  let expiresAfter = $state('P1D');
  let inviteLinkSlug = $state('');
  let selectedGroups = $state<GroupWithMeta[]>([]);

  const handleCreateNewInviteLink = async () => {
    if (!inviteLinkSlug) {
      inviteLinkSlug = randomString(8);
    }
    const basePayload = {
      maxUses:
        numberOfUses === t('admin.inviteLink.unlimited')
          ? 1000
          : Number(numberOfUses),
      expiresAt: `${end(parse(expiresAfter)).toISOString()}`,
      slug: inviteLinkSlug,
      active: true,
      ...(selectedGroups.length
        ? { groupIds: selectedGroups.map((g) => g.id) }
        : {}),
    };
    inviteLink = await createInviteLink(basePayload)
      .then((result) => {
        toastStore.trigger(
          toast({
            message: t('admin.inviteLink.generateSuccess'),
            background: 'variant-filled-success',
          }),
        );
        return result;
      })
      .catch(() => {
        toastStore.trigger(
          toast({
            message: t('admin.inviteLink.generateError'),
            background: 'variant-filled-error',
          }),
        );
        return undefined;
      });
  };

  const deactivateInviteLink = deactivateInviteLinkMutation();
  const activateInviteLink = activateInviteLinkMutation();
</script>

<ModalWrapper extraClassNames="md:w-1/3">
  <ModalHeader title={t('admin.inviteLink.title')} />

  <article class="flex flex-col p-3">
    <div class="w-full">
      <h4>{t('admin.inviteLink.description')}</h4>
      <div class="">
        <label class="mb-3 block" for="invite-auto-join-groups"
          >{t('admin.inviteLink.autoJoinGroups')}</label
        >
        <p class="text-surface-600-400-token mb-2 text-sm">
          {t('admin.inviteLink.autoJoinGroupsHint')}
        </p>
        <div id="invite-auto-join-groups">
          <GroupSelector
            groups={(
              $me?.memberships?.map((m) => m.group as GroupWithMeta) || []
            ).filter((g) => canAddMember($me, g))}
            bind:selectedGroups
            placeholder={t('admin.inviteLink.selectGroupsPlaceholder')}
            container="mb-0"
            overRide
          />
        </div>
      </div>
      <div class="space-y-3">
        <div class="">
          <label for="" class="mb-3">{t('admin.inviteLink.numberOfUses')}</label
          >
          <select
            class="bg-surface-300 w-full rounded-md border p-2"
            name=""
            id=""
            bind:value={numberOfUses}
          >
            <option value="1">1</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
            <option value={t('admin.inviteLink.unlimited')}
              >{t('admin.inviteLink.unlimited')}</option
            >
          </select>
        </div>
        <div class="">
          <label for="" class="mb-3">{t('admin.inviteLink.expiresAfter')}</label
          >
          <select
            class="bg-surface-300 w-full rounded-md border p-2"
            name=""
            id=""
            bind:value={expiresAfter}
          >
            <option value="P1D">{t('admin.inviteLink.oneDay')}</option>
            <option value="P2D">{t('admin.inviteLink.twoDays')}</option>
            <option value="P1W">{t('admin.inviteLink.oneWeek')}</option>
            <option value="P1M">{t('admin.inviteLink.oneMonth')}</option>
            <option value="P100Y">{t('admin.inviteLink.never')}</option>
          </select>
        </div>
      </div>
    </div>
    {#if inviteLink}
      <div class="bg-surface-50 mx-auto my-2 w-[96%] rounded-md border p-2">
        <div class="mb-4 flex items-center gap-x-2 text-center">
          <span class="text-wrap"
            >{truncateText(
              location
                .toString()
                .replace(location.pathname, '/auth/register/invitation') +
                `?inviteCode=${inviteLinkSlug}`,
              60,
            )}
          </span>
          <button
            title={t('admin.inviteLink.copyToClipboard')}
            onclick={() => {
              navigator.clipboard.writeText(
                location
                  .toString()
                  .replace(location.pathname, '/auth/register/invitation') +
                  `?inviteCode=${inviteLinkSlug}`,
              );
              toastStore.trigger(
                toast({
                  message: t('admin.inviteLink.copiedToClipboard'),
                  background: 'variant-filled-success',
                }),
              );
            }}
          >
            <Copy />
          </button>
        </div>
        <div class="text-center">
          {t('admin.inviteLink.totalLinkUses', { uses: 0 })}
        </div>
      </div>
    {/if}
    {#if inviteLink}
      <div class="mt-4 flex items-center justify-between">
        {#if inviteLink?.active}
          <Button
            title={t('admin.inviteLink.deactivateTitle')}
            variant="variant-filled-error"
            action={() => {
              deactivateInviteLink({ id: inviteLink?.id ?? '' })
                .then(() => {
                  if (!inviteLink) return;
                  inviteLink = { ...inviteLink, active: false };
                  toastStore.trigger(
                    toast({
                      message: t('admin.inviteLink.deactivateSuccess'),
                      background: 'variant-filled-success',
                    }),
                  );
                })
                .catch(() => {
                  toastStore.trigger(
                    toast({
                      message: t('admin.inviteLink.deactivateError'),
                      background: 'variant-filled-error',
                    }),
                  );
                });
            }}
            class="w-[48%]"
          >
            {t('admin.inviteLink.deactivate')}
          </Button>
        {:else}
          <Button
            title={t('admin.inviteLink.activateTitle')}
            variant="variant-filled-primary"
            action={() => {
              activateInviteLink({ id: inviteLink?.id ?? '' })
                .then(() => {
                  if (!inviteLink) return;
                  inviteLink = { ...inviteLink, active: true };
                  toastStore.trigger(
                    toast({
                      message: t('admin.inviteLink.activateSuccess'),
                      background: 'variant-filled-success',
                    }),
                  );
                })
                .catch(() => {
                  toastStore.trigger(
                    toast({
                      message: t('admin.inviteLink.activateError'),
                      background: 'variant-filled-error',
                    }),
                  );
                });
            }}
            class="w-[48%]"
          >
            {t('admin.inviteLink.activate')}
          </Button>
        {/if}
        <Button
          title={t('admin.inviteLink.closeModal')}
          variant="variant-filled-primary"
          class="w-[48%]"
          action={() => {
            modalStore.close();
          }}
        >
          {t('admin.inviteLink.done')}
        </Button>
      </div>
    {:else}
      <Button
        title={t('admin.inviteLink.generateTitle')}
        action={handleCreateNewInviteLink}
        variant="variant-filled-primary"
        class="mt-4"
      >
        {t('admin.inviteLink.generateButton')}
      </Button>
    {/if}
  </article>
</ModalWrapper>
