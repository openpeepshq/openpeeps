/** Strip a leading `@` from group/profile URL params (segment is `@handle`). */
export const routeHandleParam = (handle: string | undefined) =>
  handle?.replace(/^@/, '') ?? '';
