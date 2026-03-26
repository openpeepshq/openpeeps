import { ClientConfig, ClientConfigSource, FormDataSource } from '../types';

export const resolveConfig = async (source: ClientConfigSource): Promise<ClientConfig> => {
  if (!source) return {};
  if (typeof source === 'function') {
    return await source();
  } else {
    return source;
  }
};

export const replacePathParams = (
  pathTemplate: string,
  pathParams?: Record<string, string | number>,
) => {
  if (!pathParams) {
    return pathTemplate;
  }

  let path = pathTemplate;
  for (const [k, v] of Object.entries(pathParams)) {
    path = path.replace(`:${k}`, String(v));
  }
  return path;
};

export const convertToFormData = (source: FormDataSource): FormData => {
  const formData = new FormData();

  for (const [k, v] of Object.entries(source)) {
    if (Array.isArray(v)) {
      for (const value of v) {
        formData.append(k, value);
      }
    } else {
      formData.append(k, v);
    }
  }
  return formData;
};

export const stringifyValues = (source?: Record<string, string | number>) =>
  source && Object.fromEntries(Object.entries(source).map(([k, v]) => [k, String(v)]));
