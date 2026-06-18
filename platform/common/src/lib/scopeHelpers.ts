import { AuthorizationData, ProfileResourceType, PublicPost, Resource, Scope, ScopeLevel, ServiceResourceType } from "../types";

const includesScopeLevel = (scopeLevel: ScopeLevel, requiredScopeLevel: ScopeLevel) => {
    switch (requiredScopeLevel) {
        case 'write':
            return scopeLevel === 'write' || scopeLevel === 'admin';
        case 'read':
            return scopeLevel === 'read' || scopeLevel === 'write' || scopeLevel === 'admin';
        case 'admin':
            return scopeLevel === 'admin';
    }
};

const calculateRequiredScopeLevel = (requiredCapabilities: string[]): ScopeLevel => {
    return requiredCapabilities.reduce((acc: ScopeLevel, capability: string) => {
        if (acc === 'admin') {
            return 'admin';
        }
        if (capability.endsWith('-create') || capability.endsWith('-update') || capability.endsWith('-delete')) {
            return 'write';
        } else if (!capability.endsWith('-read')) {
            return 'admin';
        }
        return acc;
    }, 'read' as ScopeLevel);
};

export const calculateRequiredScope = (
    { resource, requiredCapabilities }:
        {
            resource: Resource,
            requiredCapabilities: string[]
        }): Scope => ({
            scopeLevel: calculateRequiredScopeLevel(requiredCapabilities),
            resource,
        })

export const scopeMatches = ({
    scopes,
    requiredScope,
}: {
    scopes?: Scope[];
    requiredScope: Scope;
}) =>
    Array.isArray(scopes) &&
    !!scopes.find(
        (s) =>
            (!s.scopeLevel || !requiredScope.scopeLevel || includesScopeLevel(s.scopeLevel, requiredScope.scopeLevel)) &&
            (!s.resource.id ||
                s.resource.id === requiredScope.resource.id ||
                s.resource.id === '*' ||
                requiredScope.resource.id === '*') &&
            (s.resource.type === requiredScope.resource.type ||
                s.resource.type === '*' ||
                requiredScope.resource.type === '*'),
    );

export const getPublicPostReadScope = (postId: string): Scope => ({
    scopeLevel: 'read',
    resource: { type: 'posts', id: postId },
});

/** Public posts are readable without auth; grant read scope for that post id. */
export const withPublicPostReadScopes = (
    authData: AuthorizationData,
    post: Pick<PublicPost, 'id' | 'visibility'>,
    neededCapabilities: string[],
): AuthorizationData => {
    if (
        post.visibility !== 'public' ||
        !neededCapabilities.every((c) => c.endsWith('-read'))
    ) {
        return authData;
    }
    const publicReadScope = getPublicPostReadScope(post.id);
    const scopes = authData.scopes ?? [];
    if (scopeMatches({ scopes, requiredScope: publicReadScope })) {
        return authData;
    }
    return { ...authData, scopes: [...scopes, publicReadScope] };
};
