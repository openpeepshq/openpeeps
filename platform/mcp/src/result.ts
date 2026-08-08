type ClientResult<T> = { data: T } | { error: unknown };

export const unwrap = async <T>(
  result: Promise<ClientResult<T>>,
): Promise<T> => {
  const resolved = await result;
  if ('error' in resolved) {
    throw resolved.error;
  }
  return resolved.data;
};

export const jsonResult = (data: unknown) => ({
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify(data, null, 2),
    },
  ],
});

export const formatError = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

export const errorResult = (err: unknown) => ({
  isError: true as const,
  content: [
    {
      type: 'text' as const,
      text: formatError(err),
    },
  ],
});

export const runTool = async (
  fn: () => Promise<unknown>,
): Promise<ReturnType<typeof jsonResult> | ReturnType<typeof errorResult>> => {
  try {
    return jsonResult(await fn());
  } catch (err) {
    return errorResult(err);
  }
};
