import { z } from 'zod';
import {
	type EmailOptionsWithGlobals,
	publicProfileSchema,
	type Note,
	type JamEvent,
	type EmailGlobals,
	type InviteLinkWithMeta,
	type PublicAccount,
	type ProfileWithMeta,
	type Jam,
	type Event,
	type PublicPost,
	type SuccessFailureResponse,
	type ProfileSettings,
	type PostCreationData,
} from '@openpeeps/common/types';
import type { Component } from 'svelte';
import type { Verb } from '@openpeeps/fetch-client';
import type { Readable, Writable } from 'svelte/store';
import type { CreateInfiniteQueryResult, InfiniteData } from '@tanstack/svelte-query';
import type { IconType } from '@openpeeps/ui';

export interface EmailComponentProps {
	globals: EmailGlobals;
	locals?: Record<string, unknown>;
}

export type SvelteEmailComponentType = Component<Record<string, unknown>>;

export const metadataSchema = z.object({
	profile: publicProfileSchema,
	handRaised: z.string().datetime().optional(),
	external: z.boolean(),
	observer: z.literal(false),
});
export type MetadataType = z.infer<typeof metadataSchema>;

export const observerMetadataSchema = z.object({
	observer: z.literal(true),
});

export const localParticipantMetadataSchema = z.discriminatedUnion('observer', [metadataSchema, observerMetadataSchema]);
export type LocalParticipantMetadataType = z.infer<typeof localParticipantMetadataSchema>;

export interface PayloadMutationSettings {
	method?: Verb;
	queryKeys?: string[][];
}

export interface NoPayloadMutationSettings {
	method?: Verb;
	queryKeys?: string[][];
}

export interface CreatePollData {
	type: 'question';
	options: Note[];
	expiresAt?: string;
	multiple?: boolean;
	votersVisible?: boolean;
}

export interface JamChatContext {
	sessionEvents: Readable<JamEvent[]>;
	sendMessage: (message: string) => Promise<void>;
	query: CreateInfiniteQueryResult<InfiniteData<JamEvent[], unknown>, SuccessFailureResponse>
}

export interface Crumb {
	text: string;
	link?: string;
}

export interface PageHeader {
	title?: string | Component;
	actions?: Component;
}

export type InviteLinkRow = {
	link: string;
	createdBy: string;
	dateCreated: string;
	uses: string;
	status: string;
	action: InviteLinkWithMeta;
};

export interface SvelteEmailTemplate<Locals = unknown> {
	component: Component<{ globals: EmailGlobals; locals: Locals }>;
	renderSubject: (props: EmailOptionsWithGlobals & { locals: Locals }) => Promise<string>;
}

export type SvelteEmailTemplateNew<Locals> = Component<{
	globals: EmailGlobals;
	locals: Locals;
}> & { renderSubject: (props: EmailOptionsWithGlobals & { locals: Locals }) => string };

export interface IdentityContext {
	profile?: ProfileWithMeta;
	account?: PublicAccount;
	profileSettings?: ProfileSettings;
}

export interface JamContext {
	jam: Jam;
	jamEvent: Event;
	jamPost: PublicPost;
}

export type StoreValue<T> = T extends Readable<infer U> | Writable<infer U> ? U : never;

export interface NewPostsState {
	jam: PostCreationData;
	resetNewJamState: () => void;
	event: PostCreationData;
	resetNewEventState: () => void;
	article: PostCreationData;
	resetNewArticleState: () => void;
	note: PostCreationData;
	resetNewNoteState: () => void;
	question: PostCreationData;
	resetNewQuestionState: () => void;
}

export interface PlusButtonAction {
	action: string | (() => Promise<unknown> | unknown);
	icon?: IconType;
	title?: string;
}

export type PlusButtonActions = PlusButtonAction | PlusButtonAction[] | undefined;