<script lang="ts">
  import { handleRegex, type MentionWithProfile } from '@openpeeps/common/types';
  import { matchesQuery } from '@openpeeps/common/lib';
  import { profilesStore } from '$lib/api';
  import { Button, Loader, preventDefault, stopPropagation } from '@openpeeps/ui';
  import { ProfileCard } from '$lib/components/core/profile';
  import { extractMentions } from '$lib/components/core/post/post-form/helpers';
  import { i18nContext } from '$lib/components/i18n';
  import OpenpeepsMarkdown from '../markdown/OpenpeepsMarkdown.svelte';

  const { t } = i18nContext();

  const profilesQuery = profilesStore();

  interface Props {
    value?: string;
    maxLength?: number;
    mentions?: MentionWithProfile[];
    placeholder?: string;
    oninput?: (value: string) => void;
    inline?: boolean;
    heightClass?: string;
    previewButton?: boolean;
  }

  let {
    value = $bindable(''),
    maxLength = 500,
    mentions = $bindable([]),
    placeholder = "what's on your mind?",
    oninput = undefined,
    inline = false,
    heightClass = 'h-36',
    previewButton = true,
  }: Props = $props();

  let profileSearch: string = $state('');
  let showMentionsPopup: boolean = $state(false);
  let currentLength = $state(value.length);

  let showPreview: boolean = $state(false);

  const handleInput = (event: Event) => {
    const textArea = event.target as HTMLTextAreaElement;
    currentLength = textArea.value.length;
    oninput?.(textArea.value);
    if ((event as InputEvent).data === '@' && !showMentionsPopup) {
      showMentionsPopup = true;
    } else {
      const lastAtIndex = textArea.value
        .substring(0, textArea.selectionStart)
        .lastIndexOf('@');
      profileSearch = textArea.value.substring(
        lastAtIndex + 1,
        textArea.selectionStart,
      );

      if (
        lastAtIndex === -1 ||
        !handleRegex.test(
          textArea.value.substring(lastAtIndex + 1, textArea.selectionStart),
        )
      ) {
        profileSearch = '';
        showMentionsPopup = false;
      }
    }
  };

  let textBox: HTMLTextAreaElement | undefined = $state();

  const listedProfiles = () =>
    $profilesQuery?.data?.filter(
      (profile) => !profileSearch || matchesQuery(profile, profileSearch),
    ) ?? [];
</script>

<div class="relative w-full">
  {#if showPreview}
    <div
      class="bg-surface-50 border-surface-200 absolute left-0 top-0 z-10 size-full overflow-y-auto rounded-md border p-4 pt-16"
    >
      <Button
        compact
        variant="variant-ringed-surface"
        action={() => {
          showPreview = false;
        }}
        class="absolute left-2 top-2"
      >
        {t('form.edit')}
      </Button>
      <OpenpeepsMarkdown source={value} linkPreviewMode="none" />
    </div>
  {/if}
  {#if previewButton}
    <div class="w-full pb-2" class:p-2={!inline}>
      <Button
        compact
        variant="variant-ringed-surface"
        action={() => {
          showPreview = true;
        }}
      >
        {t('form.preview')}
      </Button>
    </div>
  {/if}
  <textarea
    oninput={handleInput}
    onchange={() =>
      (mentions = extractMentions(value, $profilesQuery.data || []))}
    bind:value
    bind:this={textBox}
    class="textarea {heightClass} w-full resize-y rounded"
    class:border-none={!inline}
    class:bg-transparent={!inline}
    maxlength={maxLength}
    {placeholder}
  ></textarea>
  <div class="w-full px-2 text-right text-sm">
    <span class:text-error-500={currentLength > maxLength}>
      {currentLength}
    </span>
    / {maxLength}
  </div>
  <!-- Mentions -->
  {#if showMentionsPopup}
    <Loader queries={[$profilesQuery]}>
      <div
        class={[
          'variant-ringed-surface bg-surface-50 overflow-y-auto rounded p-4',
          inline && 'absolute left-[10%] top-24 h-64 w-[80%]',
          !inline && 'h-32',
        ]}
      >
        {#each listedProfiles() as profile (profile.id)}
          <button
            title="Mention"
            class="w-full"
            onclick={preventDefault(
              stopPropagation(() => {
                const content = value;
                if (content) {
                  const caretPosition = textBox?.selectionStart || 0;
                  const lastAtIndex = content.lastIndexOf('@') || 0;

                  if (lastAtIndex !== -1) {
                    value = `${content.substring(0, lastAtIndex)} @${profile.handle} ${content.substring(caretPosition)}`;
                    if (textBox) {
                      textBox.value = value;
                    }
                    profileSearch = '';
                    showMentionsPopup = false;
                  }
                }
              }),
            )}
          >
            <ProfileCard
              {profile}
              avatarSize={1.5}
              showAction={false}
              noPadding
            />
          </button>
        {/each}
        {#if listedProfiles().length === 0}
          <p class="mt-4 text-center text-neutral-400">No profiles found</p>
        {/if}
      </div>
    </Loader>
  {/if}
</div>
