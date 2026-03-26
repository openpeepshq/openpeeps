import { HashtagData } from "@openpeeps/common/types";
import { map } from "@openpeeps/arango-querybuilder";
import { collectionInfos } from "../db/structure";
import { Hashtag } from "@openpeeps/common/types";

export const hashtagsMapping = map<HashtagData, Hashtag>({
    collection: collectionInfos.hashtagsCollection.name,
});