/**
 * Shared `useAuthData` mock surface for component tests. The web tests mock
 * `components/layout/IdentityContext` (where `useAuthData` is defined) and the
 * RN parity tests mock `@openpeepshq/react` (where it is re-exported), so the
 * two mock targets can never be the same module — but both hand the hook this
 * same value factory, which keeps the profile the tree sees identical on both
 * platforms and in one place: if the hook gains fields, both platforms need
 * them here once, not twice.
 *
 * `authDataState.roles` is mutated by the test (per case); the factory reads
 * it at call time, which is what makes it safe inside a hoisted `vi.mock` /
 * `jest.mock` factory. The roles carry only the capability surface the gated
 * components read; a full `Role` is assignable here (structural), but the
 * helper deliberately takes no imports so it stays loadable in both test
 * runtimes (vitest web, jest RN).
 */
type RoleLike = { capabilities?: { add?: string[] } };

export const authDataState = {
  roles: [] as RoleLike[],
  profileId: 'u-1' as string | undefined,
};

export const makeAuthDataValue = () => ({
  profile:
    authDataState.roles.length > 0
      ? {
          ...(authDataState.profileId ? { id: authDataState.profileId } : {}),
          roles: authDataState.roles,
        }
      : undefined,
});
