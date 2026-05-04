<script lang="ts">
	import { getPostContext, jamAttendanceStore, me } from '$lib/api';
	import { OpenpeepsMarkdown } from '$lib/components/core/markdown';
	import {
		buildThreads,
		calculateEffectiveRsvps,
		groupName,
		profileName
	} from '@openpeeps/common/lib';
	import type { PublicPost, Event, PublicProfile } from '@openpeeps/common/types';
	import { Button, getModalManager, Loader, PopupMenu, PopupMenuButton, UpdatingDate } from '@openpeeps/ui';
	import { Tab, TabGroup } from '@skeletonlabs/skeleton';
	import { Share } from 'lucide-svelte';
	import { ThreadedFeed } from '../..';
	import ReplyBox from '../../ReplyBox.svelte';
	import EventLocation from '../../pieces/EventLocation.svelte';
	import ShareMenu from '../../pieces/ShareMenu.svelte';
	import EventMenu from '../../pieces/EventMenu.svelte';
	import EventRsvpButton from './EventRsvpButton.svelte';
	import { Avatar, FollowUnfollowButton, ProfileCard, ProfileFromId } from '$lib/components/core/profile';
	import { goto } from '$app/navigation';
	import { CreateNewConversation } from '$lib/components/core/conversations';
	import { i18nContext } from '$lib/components/i18n';
	import { AccessDeniedLoader } from '$lib/components/layout';
	import { page } from '$app/state';
	import { postViewCounter } from '$lib/utils';

	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();
	const modalManager = getModalManager();
	const { t } = i18nContext();
	const event = $derived(post.data as Event);
	const isEventModerator = $derived(event.moderators?.find((mId) => mId === $me.id));
	const myEvent = $derived(post.profile?.id === $me?.id);
	const iAmModerator = $derived(event.moderators?.includes($me?.id));
	const group = $derived(post.group ? post.group : undefined);
	const rsvps = $derived(calculateEffectiveRsvps(post));

	const jamAttendeesQuery = jamAttendanceStore(post.id);
	let tabSet = $state(post.data?.content ? 'description' : 'replies');

	let postContextQuery = getPostContext(post.id);

	let descendentThreads = $derived(
		($postContextQuery.data && buildThreads($postContextQuery.data.descendants)) || []
	);
</script>

<div class="flex w-full flex-col gap-2 p-3" use:postViewCounter={post.id}>
	<img
		src={event.image || '/img/event-default.png'}
		class="mb-3 h-48 w-full rounded object-cover"
		alt="image for {event.name}"
	/>

	<div class="flex items-center justify-between">
		<div class="">
			<div class="flex gap-x-4">
				<span class="bg-surface-200 mb-3 rounded-lg px-3 py-1">
					{post?.groupId ? t('events.group') : t('events.community')}
				</span>
				<!-- <span class="bg-surface-200 mb-3 rounded-lg px-3 py-1">
					{(event?.maxAttendees || 0) - (attendees?.length || 0)} slots left
				</span> -->
			</div>
			{#if post?.groupId}
				<Button class="text-muted-foreground anchor" action={() => goto(`/groups/@${post.group?.handle}`)}
					>{groupName(group)}</Button
				>
			{/if}
		</div>
		<div class="flex items-center gap-x-2">
			<ShareMenu {post} variant="variant-ringed-primary">
				{#snippet menuButton()}
					<Share class="size-4" />
				{/snippet}
			</ShareMenu>
			{#if $me?.id === post.profile.id}
				<EventMenu {post} variant="variant-ringed-primary" class="size-10 p-0" />
			{/if}
		</div>
	</div>

	<h1 class="h2">{event.name}</h1>
	<div class="mt-2 flex items-center gap-x-2">
		<div>
			<Avatar profile={post?.profile as PublicProfile} size={2} />
		</div>
		<div>
			{t('events.hostedBy', {profileName: `${profileName(post.profile)}${myEvent ? ' · You' : ''}`})}
		</div>
	</div>
	{#if event?.start}
		<div class="mt-4 flex gap-x-4">
			<div class="border-foreground/20 rounded-md border-[0.5px] px-4 py-1">
				<p class="text-center">
					{new Date(event?.start || '').toLocaleString(undefined, {
						month: 'short'
					})}
				</p>
				<p class="text-center">{new Date(event?.start || '').getDate()}</p>
			</div>
			<div>
				<span class="opacity-50">{t('events.startDate')}</span>
				<p class="">
					{new Date(event?.start || '').toLocaleDateString(undefined, {
						weekday: 'long',
						month: 'long',
						day: 'numeric',
						year: 'numeric'
					})}
				</p>
				<p class="text-muted-foreground mt-2">
					{new Date(event?.start || '').toLocaleTimeString(undefined, {
						hour: '2-digit',
						minute: '2-digit',
						timeZoneName: event?.start ? undefined : 'short'
					})}
				</p>
			</div>
		</div>
	{/if}
	{#if event?.end}
		<div class="mt-4 flex gap-x-4">
			<div class="border-foreground/20 rounded-md border-[0.5px] px-4 py-1">
				<p class="text-center">
					{new Date(event?.start || '').toLocaleString(undefined, {
						month: 'short'
					})}
				</p>
				<p class="text-center">{new Date(event?.start || '').getDate()}</p>
			</div>
			<div>
				<span class="opacity-50">{t('events.endDate')}</span>
				<p class="">
					{new Date(event?.end || '').toLocaleDateString(undefined, {
						weekday: 'long',
						month: 'long',
						day: 'numeric',
						year: 'numeric'
					})}
				</p>
				<p class="text-muted-foreground mt-2">
					{event?.end &&
						new Date(event?.end || '').toLocaleTimeString(undefined, {
							hour: '2-digit',
							minute: '2-digit',
							timeZoneName: event?.end ? undefined : 'short'
						})}
				</p>
			</div>
		</div>
	{/if}
	<EventLocation {post} preview={false} />
	<EventRsvpButton {post} />
	{#if event.jam}
		{#if myEvent || isEventModerator}
			<Button
				variant="variant-filled-primary"
				action={`${page.url.origin}/events/${post.id}/jam`}
				class="w-full">{t('events.jam.start')}
			</Button>
		{/if}
	{/if}
	<TabGroup>
		{#if post.data?.content}
			<Tab bind:group={tabSet} name="description" value="description"
				>{t('events.tabs.description')}</Tab
			>
		{/if}
		<Tab bind:group={tabSet} name="replies" value="replies">{t('events.tabs.discussion')}</Tab>
		<Tab bind:group={tabSet} name="rsvps" value="rsvps">{t('events.tabs.rsvps')}</Tab>
		{#if event.jam && (myEvent || iAmModerator) && $jamAttendeesQuery.isSuccess}
			<Tab bind:group={tabSet} name="attendees" value="attendees"
				>{t('events.tabs.jamAttendees')}</Tab
			>
		{/if}
		{#snippet panel()}
			{#if tabSet === 'description'}
				<div>
					<OpenpeepsMarkdown source={event.content} />
				</div>
			{:else if tabSet === 'replies'}
				<ReplyBox {post} />
				<AccessDeniedLoader queries={[$postContextQuery]}>
					{#each descendentThreads as thread (thread.id)}
						<ThreadedFeed {thread} />
					{/each}
				</AccessDeniedLoader>
			{:else if tabSet === 'rsvps'}
				{#each rsvps as rsvp (rsvp.createdAt)}
					<ProfileCard profile={rsvp.profile} avatarSize={2}>
						{#snippet action()}
							<PopupMenu>
								{#if $me?.following?.find((f) => f.id === rsvp.profile.id)}
									<PopupMenuButton
										action={() =>
											modalManager.show(CreateNewConversation, {
												profiles: [rsvp.profile],
												skipProfileSelection: true
											})}
										title={t('profile.actions.message')}
										text={t('profile.actions.message')}
									/>
								{/if}
								<FollowUnfollowButton profile={rsvp.profile} btnType={'popup'} />
							</PopupMenu>
						{/snippet}
					</ProfileCard>
				{:else}
					<p class="text-muted-foreground">{t('events.noRsvps')}</p>
				{/each}
			{:else if tabSet === 'attendees'}
				<AccessDeniedLoader queries={[$jamAttendeesQuery]}>
					{#if $jamAttendeesQuery?.data}
						{#each $jamAttendeesQuery.data as attendee (attendee.id)}
							<ProfileFromId profileId={attendee.profileId} avatarSize={2} >
								{#snippet action()}
									<UpdatingDate date={attendee.createdAt} />
								{/snippet}
							</ProfileFromId>
						{:else}
							<p class="text-muted-foreground">{t('events.noAttendees')}</p>
						{/each}
					{/if}
				</AccessDeniedLoader>
			{/if}
		{/snippet}
	</TabGroup>
</div>
