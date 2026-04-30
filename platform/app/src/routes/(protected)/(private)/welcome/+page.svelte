<script lang="ts">
  import {
    me,
    getPostsByProfileStore,
    currentAccountStore,
    validateEmailAction,
  } from '@openpeeps/svelte/api';
  import { AccessDeniedLoader, OpenpeepsMarkdown, NewPostModal } from '@openpeeps/svelte/components';
  import type { PublicPost } from '@openpeeps/common/types';
  import { getModalManager } from '@openpeeps/ui';
  import type { CreateQueryResult } from '@tanstack/svelte-query';
  import {
    CheckIcon,
    ChevronRight,
    MailIcon,
    PencilIcon,
    SquareUserRound,
    UserCheck,
  } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '@openpeeps/svelte';
  import { getServerInfo } from '@openpeeps/svelte/server';

  const modalManager = getModalManager();
  const toastStore = getToastStore();
  const serverInfo = getServerInfo();

  let postQuery: CreateQueryResult<PublicPost[]> = getPostsByProfileStore(
    $me.id,
  );

  let accountQuery = currentAccountStore();

  let triggerEmailValidation = validateEmailAction();

  const handleTriggerValidation = () => {
    triggerEmailValidation().then((res) => {
      toastStore.trigger(
        toast({
          message: res?.success
            ? 'validation email sent'
            : 'failed to send validation email',
          background: res?.success
            ? 'variant-filled-success'
            : 'variant-filled-error',
        }),
      );
    });
  };

  let accountChecklistItems = $derived([
    {
      Icon: MailIcon,
      label: 'Verify your email address',
      key: 'verify-email',
      completed: $accountQuery.data?.emailValidated ?? false,
      action: handleTriggerValidation,
    },
    {
      Icon: SquareUserRound,
      label: 'Add profile details',
      key: 'profile-details',
      completed: !!$me?.avatar && !!$me?.bio && !!$me?.header,
      route: 'settings#profile',
    },
    {
      Icon: PencilIcon,
      label: 'Make first post',
      key: 'make-post',
      completed: ($postQuery.data ?? []).length > 0,
      action: () => {
        modalManager.show(NewPostModal, {});
      },
    },
    {
      Icon: UserCheck,
      label: 'Connect with others',
      key: 'connect-with-others',
      completed: ($me?.following.length ?? 0) > 0,
      route: '/members',
    },
  ]);

  const privacyPolicyLink =
    serverInfo.communityConfig.info.privacyPolicy || '/docs/privacy';

  const termsAndConditionsLink =
    serverInfo.communityConfig.info.termsAndConditions;
</script>

<div
  class="
      col-span-3 min-h-[90vh] relative pt-4 rounded-md p-6
      bg-no-repeat bg-left-bottom
  "
>
  <h1 class="flex text-5xl pb-4 mt-8 font-bold">
    Welcome to {serverInfo?.communityConfig.info.name}
  </h1>

  <div class="text-left">
    <OpenpeepsMarkdown
      source={serverInfo?.communityConfig.content?.welcomePage ||
        'Welcome to this community, hosted on AllPeep.'}
    />
  </div>

  <div class="text-3xl font-bold my-4">Complete account setup</div>
  {#each accountChecklistItems as item}
    <AccessDeniedLoader queries={[$postQuery, $accountQuery]}>
      <div
        class="flex px-1 flex-row justify-between items-center w-full py-2 rounded-md mb-2 cursor-pointer"
        onclick={async () => {
          if (item.action) {
            item.action();
          } else {
            await goto(item.route);
          }
        }}
      >
        <div
          class="flex p-4 items-center justify-center rounded-full bg-surface-100"
        >
          <item.Icon />
        </div>
        <div class="flex-1 ml-4 text-lg">{item.label}</div>
        {#if item.completed}
          <div
            class="flex items-center justify-center bg-secondary rounded-full p-2"
          >
            <CheckIcon class="text-background" />
          </div>
        {:else}
          <div class="flex items-center justify-center p-2">
            <ChevronRight class="text-foreground" />
          </div>
        {/if}
      </div>
    </AccessDeniedLoader>
  {/each}

  <h2 class="flex justify-left text-4xl pb-4 mt-8 font-bold">Useful Links</h2>
  <ul>
    <li><a class="anchor" href="/feeds/local">See community content</a></li>
    <li>
      <a class="anchor" href="/settings">Change your name, photo and bio</a>
    </li>
    <li><a class="anchor" href="/docs">View documentation</a></li>
    <li><a class="anchor" href="/members">See all community members</a></li>
    <li><a class="anchor" href={privacyPolicyLink}>Privacy policy</a></li>
    <li>
      <a class="anchor" href={termsAndConditionsLink}>Terms and conditions</a>
    </li>
    <li><a class="anchor" href="/code-of-conduct">Code of conduct</a></li>
  </ul>

  <div class="text-center pt-6"></div>
</div>
