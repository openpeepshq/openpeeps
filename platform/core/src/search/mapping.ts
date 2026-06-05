import { ProfileWithMeta } from "@openpeeps/common/types";
import { groupsMapping } from "../groups";
import { canSeeGroupFilter } from "../groups/helpers";
import { profilesMapping } from "../profiles/mapping";
import { baseListPosts } from "../posts/finders";

export const groupSearchMapping = (profile: ProfileWithMeta, query: string) => groupsMapping.filter(canSeeGroupFilter(profile)).fulltextSearch({
    view: 'groupSearch',
    analyzer: 'text_en',
    fields: ['handle', 'displayName', 'description', 'rules'],
    query,
});

export const profileSearchMapping = (profile: ProfileWithMeta, query: string) => profilesMapping.fulltextSearch({
    view: 'profileSearch',
    analyzer: 'text_en',
    fields: [
        'handle',
        'displayName',
        'bio',
        'fields',
        'location.text',
        'fields[0].value',
        'fields[1].value',
        'fields[2].value',
        'fields[3].value',
        'fields[4].value',
        'fields[5].value',
        'fields[6].value',
        'fields[7].value',
        'fields[8].value',
        'fields[9].value',
        'fields[10].value',
        'fields[11].value',
        'fields[12].value',
    ],
    query,
})

// ArangoDB SEARCH cannot match array wildcards, so attachment fields are
// enumerated per index. Capped at the first MAX_SEARCHABLE_ATTACHMENTS
// attachments of a post (the inverted index itself covers all of them via
// `data.attachments[*]`).
const MAX_SEARCHABLE_ATTACHMENTS = 10;

const attachmentSearchFields = Array.from(
    { length: MAX_SEARCHABLE_ATTACHMENTS },
    (_, i) => [`data.attachments[${i}].description`, `data.attachments[${i}].filename`],
).flat();

const postSearchDefinition = (query: string) => ({
    view: 'postSearch',
    analyzer: 'text_en',
    fields: [
        'data.content',
        'data.name',
        'data.physicalLocation.text',
        'data.url',
        'data.options[0].content',
        'data.options[1].content',
        'data.options[2].content',
        'data.options[3].content',
        'data.options[4].content',
        'data.options[5].content',
        'data.options[6].content',
        ...attachmentSearchFields,
    ],
    query,
})

export const postSearchMapping = (profile: ProfileWithMeta, query: string) =>
    baseListPosts({ profile })
        .filter('DOC.visibility != "direct"')
        .fulltextSearch(postSearchDefinition(query))

export const eventSearchMapping = (profile: ProfileWithMeta, query: string) =>
    baseListPosts({ profile })
        .filter({ matches: { type: "event" } })
        .fulltextSearch(postSearchDefinition(query))

export const jamSearchMapping = (profile: ProfileWithMeta, query: string) =>
    baseListPosts({ profile })
        .filter({ matches: { type: "event" } })
        .filter('DOC.data.jam != null')
        .fulltextSearch(postSearchDefinition(query))
