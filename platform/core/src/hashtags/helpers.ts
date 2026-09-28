import type { Hashtag, Profile } from '@openpeepshq/common/types';
import { connector, disconnector } from '../db/helpers';
import { collectionInfos } from '../db';

export const profileHashtagConnector = connector<Profile, Hashtag>(
  collectionInfos.profilesCollection,
  collectionInfos.hashtagsCollection,
  collectionInfos.profileHashtagsCollection,
);

export const profileHashtagDisconnector = disconnector<Profile, Hashtag>(
  collectionInfos.profilesCollection,
  collectionInfos.hashtagsCollection,
  collectionInfos.profileHashtagsCollection,
);
