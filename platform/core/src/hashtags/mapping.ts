import { HashtagData } from '@openpeeps/common/types';
import { map } from '../db/pg/map';
import { collectionInfos } from '../db';
import { Hashtag } from '@openpeeps/common/types';

export const hashtagsMapping = map<HashtagData, Hashtag>({
  collection: collectionInfos.hashtagsCollection.name,
});
