import type { OpenpeepsClient } from '@openpeeps/client';
import type { ProfileWithMeta, PublicAccount } from '@openpeeps/common';
import { adminHooks, type AdminHooks } from './admin';
import { authHooks, type AuthHooks } from './auth';
import { accountHooks, type AccountHooks } from './accounts';
import { conversationHooks, type ConversationHooks } from './conversations';
import { groupHooks, type GroupHooks } from './groups';
import { jamHooks, type JamHooks } from './jams';
import { postHooks, type PostHooks } from './posts';
import { profileHooks, type ProfileHooks } from './profiles';
import { otherHooks, type OtherHooks } from './other';
import { paymentHooks, type PaymentHooks } from './payments';
import { searchHooks, type SearchHooks } from './search';
import { streamingHooks, type StreamingHooks } from './streaming';

export const buildOpenpeepsApi = (
  client: OpenpeepsClient,
  setCurrentProfile: (profile: ProfileWithMeta | undefined) => void,
  setCurrentAccount: (account: PublicAccount | undefined) => void,
): { admin: AdminHooks } & AuthHooks &
  AccountHooks &
  ConversationHooks &
  GroupHooks &
  JamHooks &
  PostHooks &
  ProfileHooks &
  SearchHooks &
  OtherHooks &
  PaymentHooks &
  StreamingHooks => ({
  admin: adminHooks(client),

  ...authHooks(client, setCurrentProfile, setCurrentAccount),

  ...accountHooks(client),

  ...conversationHooks(client),

  ...groupHooks(client),

  ...jamHooks(client),

  ...postHooks(client),

  ...profileHooks(client, setCurrentProfile),

  ...otherHooks(client),

  ...searchHooks(client),

  ...paymentHooks(client),

  ...streamingHooks(client),
});

export type OpenpeepsApi = ReturnType<typeof buildOpenpeepsApi>;
