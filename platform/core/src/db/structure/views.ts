import { ViewInfo } from "@openpeeps/arango-querybuilder";

export const viewInfos: ViewInfo[] = [
    {
        name: 'postSearch',
        type: 'search-alias',
        indexes: [
            {
                collection: 'posts',
                index: 'search-posts',
            }
        ]
    },
    {
        name: 'groupSearch',
        type: 'search-alias',
        indexes: [
            {
                collection: 'groups',
                index: 'search-groups',
            }
        ]
    },
    {
        name: 'profileSearch',
        type: 'search-alias',
        indexes: [
            {
                collection: 'profiles',
                index: 'search-profiles',
            }
        ]
    }
]