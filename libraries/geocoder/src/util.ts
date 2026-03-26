
/**
 * @internal
 */
export function getJSON<T>(
  url: string,
  params: Record<string, unknown>,
): Promise<T> {
  const headers = { Accept: 'application/json' };
  const request = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    (Array.isArray(value) ? value : [value]).forEach((v) => {
      request.searchParams.append(key, v);
    });
  });
  return fetch(request.toString(), { headers }).then((response) =>
    response.json(),
  );
}
