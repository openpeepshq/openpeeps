import {
  publicProfileSchema,
  SuccessFailureResponse,
} from '@openpeeps/common';
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';

import { z } from 'zod';

export type AuthResult = {
  success: boolean;
  error?: string;
};

export const metadataSchema = z.object({
  profile: publicProfileSchema,
  handRaised: z.string().datetime().optional(),
  external: z.boolean(),
});

export type MetadataType = z.infer<typeof metadataSchema>;

export const pollChoiceSchema = z.object({
  choices: z.array(
    z.object({
      id: z.number(),
      text: z.string(),
    }),
  ),
  pollLength: z.string(),
  allowMultipleChoices: z.boolean(),
  seeWhoVoted: z.boolean(),
});

export type PollChoiceForm = z.infer<typeof pollChoiceSchema>;

export type Theme = {
  colors: {
    primary: string;
    background: string;
    border: string;
    card: string;
    notification: string;
    text: string;
  }
}

export type InfiniteQueryResult<T> = UseInfiniteQueryResult<InfiniteData<T[]>, SuccessFailureResponse>;

export type EmptyStateContainerType =
  | 'posts'
  | 'reply'
  | 'profiles'
  | 'following'
  | 'followers'
  | 'events'
  | 'groups'
  | 'messages'
  | 'notifications'
  | 'live-jams'
  | 'upcoming-jams'
  | 'my-jams'
  | 'recorded-jams'
  | 'event-attendees'
  | 'event-description';