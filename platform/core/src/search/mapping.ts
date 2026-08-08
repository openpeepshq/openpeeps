import { ProfileWithMeta } from '@openpeeps/common/types';
import { groupsMapping } from '../groups';
import { canSeeGroupFilter } from '../groups/helpers';
import { publicProfilesSearchMapping } from '../profiles/mapping';
import { baseListPosts } from '../posts/finders';
import { postFilters } from '../db/pg/filters';

export const groupSearchMapping = (profile: ProfileWithMeta, query: string) =>
  groupsMapping.filter(canSeeGroupFilter(profile)).fulltextSearch({
    view: 'groupSearch',
    analyzer: 'text_en',
    fields: ['handle', 'displayName', 'description', 'rules'],
    query,
  });

export const profileSearchMapping = (
  _profile: ProfileWithMeta,
  query: string,
) =>
  publicProfilesSearchMapping.fulltextSearch({
    view: 'profileSearch',
    analyzer: 'text_en',
    fields: ['handle', 'displayName', 'bio', 'location.text', 'fields.value'],
    query,
  });

// Poll/attachment arrays are indexed with searchField on the parent in
// search-posts. SEARCH uses expanded paths without an array index.
const postSearchDefinition = (query: string) => ({
  view: 'postSearch',
  analyzer: 'text_en',
  fields: [
    'data.content',
    'data.name',
    'data.physicalLocation.text',
    'data.url',
    'data.options.content',
    'data.attachments.description',
    'data.attachments.filename',
  ],
  query,
});

export const postSearchMapping = (profile: ProfileWithMeta, query: string) =>
  baseListPosts({ profile })
    .filter(postFilters.notDirect())
    .fulltextSearch(postSearchDefinition(query));

export const eventSearchMapping = (profile: ProfileWithMeta, query: string) =>
  baseListPosts({ profile })
    .filter({ matches: { type: 'event' } })
    .fulltextSearch(postSearchDefinition(query));

export const jamSearchMapping = (profile: ProfileWithMeta, query: string) =>
  baseListPosts({ profile })
    .filter({ matches: { type: 'event' } })
    .filter(postFilters.hasJam())
    .fulltextSearch(postSearchDefinition(query));
