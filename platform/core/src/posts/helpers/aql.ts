import { ProfileWithMeta } from "@openpeeps/common/types";

export const yesOrMaybeRsvpExpression = (profile: ProfileWithMeta) =>
    `FIRST(FOR entry IN (DOC.entries || []) FILTER entry.profile.id == '${profile.id}' AND entry.type == 'rsvp' SORT entry.createdAt DESC LIMIT 1 RETURN entry.data.response IN ['yes', 'tentative'])`