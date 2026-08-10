import { HashtagData } from '@openpeepshq/common/types';
import { map } from '../db/pg/map';
import { collectionInfos } from '../db';
import { Hashtag } from '@openpeepshq/common/types';

export const hashtagsMapping = map<HashtagData, Hashtag>({
  collection: collectionInfos.hashtagsCollection.name,
});
