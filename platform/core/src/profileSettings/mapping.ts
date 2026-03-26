import { ProfileSettingsData } from "@openpeeps/common/types";
import { map } from "@openpeeps/arango-querybuilder";
import { collectionInfos } from "../db/structure";
import { ProfileSettings } from "@openpeeps/common/types";

export const profileSettingsMapping = map<ProfileSettingsData, ProfileSettings>({
    collection: collectionInfos.profileSettingsCollection.name,
});