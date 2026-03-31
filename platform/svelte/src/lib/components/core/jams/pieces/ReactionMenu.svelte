<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { ChevronLeft, SmilePlus } from 'lucide-svelte';
	import { emojis } from '../constants';
	import {
		addRecentEmoji,
		applySkinToneToDefault,
		applySkinToneToRecentEmojis,
		getSkinToneEmoji,
		hideEmojiPickerSkinToneSelector,
		isDefaultEmoji,
		SKIN_TONE_OPTIONS,
		syncEmojiPickerSkinTone
	} from '../reactionEmojis';
	import { jamReactionPreferencesStore } from '../stores';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		onSelect: (emoji: string) => void | Promise<void>;
		mobile?: boolean;
	}

	let { onSelect, mobile = false }: Props = $props();

	const { t } = i18nContext();

	let showAllEmojis = $state(false);
	let showSkinToneSelector = $state(false);
	let pickerElement: HTMLElement | undefined = $state(undefined);

	let skinTone = $derived($jamReactionPreferencesStore.skinTone);
	let recentEmojis = $derived($jamReactionPreferencesStore.recentEmojis);

	let defaultEmojis = $derived(emojis.map((emoji) => applySkinToneToDefault(emoji, skinTone)));
	let recentDisplayEmojis = $derived(recentEmojis.filter((emoji) => !isDefaultEmoji(emoji)));
	let selectedSkinToneEmoji = $derived(getSkinToneEmoji(skinTone));

	const setSkinTone = async (tone: number) => {
		jamReactionPreferencesStore.update((preferences) => ({
			...preferences,
			skinTone: tone,
			recentEmojis: applySkinToneToRecentEmojis(preferences.recentEmojis, tone)
		}));
		await syncEmojiPickerSkinTone(tone);
		showSkinToneSelector = false;
	};

	const initializePicker = async (picker: HTMLElement | undefined, tone: number) => {
		if (!picker) {
			return;
		}

		await syncEmojiPickerSkinTone(tone);
		hideEmojiPickerSkinToneSelector(picker);
	};

	const handlePrimaryEmojiClick = async (emoji: string) => {
		await onSelect(emoji);
	};

	const handlePickerEmojiClick = async (event: CustomEvent<{ unicode: string }>) => {
		const emoji = event.detail.unicode;
		await onSelect(emoji);

		if (!isDefaultEmoji(emoji)) {
			jamReactionPreferencesStore.update((preferences) => ({
				...preferences,
				recentEmojis: addRecentEmoji(preferences.recentEmojis, emoji)
			}));
		}

		showAllEmojis = false;
	};

	const openAllEmojis = async () => {
		showSkinToneSelector = false;
		await syncEmojiPickerSkinTone(skinTone);
		showAllEmojis = true;
		await tick();
		await initializePicker(pickerElement, skinTone);
	};

	onMount(async () => {
		if (browser) {
			await import('emoji-picker-element');
			await syncEmojiPickerSkinTone(skinTone);
		}
	});

	$effect(() => {
		if (showAllEmojis && pickerElement) {
			void initializePicker(pickerElement, skinTone);
		}
	});
</script>

<div class={`bg-surface-200 rounded-2xl p-2 ${mobile ? 'w-full' : 'md:w-max'}`}>
	{#if showAllEmojis}
		<div class="mb-2">
			<button
				type="button"
				title={t('jams.reactions.backToQuickReactions')}
				class="flex items-center gap-1 p-1 text-sm"
				onclick={() => (showAllEmojis = false)}
			>
				<ChevronLeft size={16} />
				{t('jams.reactions.backToQuickReactions')}
			</button>
		</div>
		<emoji-picker bind:this={pickerElement} onemoji-click={handlePickerEmojiClick}></emoji-picker>
	{:else}
		<div class="flex flex-col gap-y-1 md:flex-row md:flex-nowrap md:items-center md:gap-x-1">
			<div class="flex flex-wrap items-center gap-x-1 md:flex-nowrap">
				{#each defaultEmojis as emoji (emoji)}
					<button
						type="button"
						title={emoji}
						class="shrink-0 p-2 text-lg"
						onclick={() => handlePrimaryEmojiClick(emoji)}
					>
						{emoji}
					</button>
				{/each}
			</div>

			<div class="flex flex-wrap items-center gap-x-1 md:flex-nowrap">
				<div class="mx-1 h-8 w-px shrink-0 self-center bg-surface-400 max-md:hidden" aria-hidden="true"></div>

				{#if recentDisplayEmojis.length > 0}
					{#each recentDisplayEmojis as emoji (emoji)}
						<button
							type="button"
							title={emoji}
							class="shrink-0 p-2 text-lg"
							onclick={() => handlePrimaryEmojiClick(emoji)}
						>
							{emoji}
						</button>
					{/each}

					<div class="mx-1 h-8 w-px shrink-0 self-center bg-surface-400" aria-hidden="true"></div>
				{/if}

				<button
					type="button"
					title={t('jams.reactions.skinToneTitle')}
					class={`shrink-0 rounded p-2 text-lg ${showSkinToneSelector ? 'bg-surface-400' : ''}`}
					onclick={() => (showSkinToneSelector = !showSkinToneSelector)}
				>
					{selectedSkinToneEmoji}
				</button>

				<button
					type="button"
					title={t('jams.reactions.allEmojisTitle')}
					class="shrink-0 p-2"
					onclick={openAllEmojis}
				>
					<SmilePlus size={20} />
				</button>
			</div>
		</div>

		{#if showSkinToneSelector}
			<div class="mt-2 flex gap-1 border-t border-surface-300 pt-2">
				{#each SKIN_TONE_OPTIONS as option (option.tone)}
					<button
						type="button"
						title={t('jams.reactions.skinToneTitle')}
						class={`rounded p-1 text-lg ${skinTone === option.tone ? 'bg-surface-400' : ''}`}
						onclick={() => setSkinTone(option.tone)}
					>
						{option.emoji}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>
