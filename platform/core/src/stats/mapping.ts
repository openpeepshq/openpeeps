import { collectionInfos } from '../db';
import { baseProfilesMapping } from '../profiles';
import { postsMapping } from '../posts';
import { map } from '../db/pg/map';
import { computedFields } from '../db/pg/queries';
import { DbPost, PostData } from '@openpeepshq/common/types';

export const profileWithActivityScoreMapping = (start?: Date, end?: Date) =>
  map({
    ...baseProfilesMapping.data(),
    activityWindow: { start, end },
    computedFields: [computedFields.profileActivityScore({ start, end })],
  });

export const postsWithActivityScoreMapping = map<
  PostData,
  DbPost & { activityScore: number }
>({
  ...postsMapping.data(),
  computedFields: [computedFields.postActivityScore()],
});

export const reactionsMapping = map({
  collection: collectionInfos.reactionsCollection.name,
});
export const followsMapping = map({
  collection: collectionInfos.followsCollection.name,
});
export const entriesMapping = map({
  collection: collectionInfos.entriesCollection.name,
});
export const repostsMapping = map({
  collection: collectionInfos.repostCollection.name,
});
