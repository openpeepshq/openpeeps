import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  pluginStoreCatalogSchema,
  pluginStoreListingSchema,
} from '@openpeepshq/common/types';
import { defaultConfig } from '@openpeepshq/core/config';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';

export const Output = pluginStoreCatalogSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-plugins-manage']);
    const storeUrl = (await defaultConfig).plugins.storeUrl;
    if (!storeUrl) {
      return { storeUrl: undefined, listings: [] };
    }
    try {
      const response = await fetch(
        `${storeUrl.replace(/\/$/, '')}/v1/listings`,
      );
      if (!response.ok) {
        return { storeUrl, listings: [] };
      }
      const parsed = pluginStoreListingSchema
        .array()
        .safeParse(await response.json());
      return {
        storeUrl,
        listings: parsed.success ? parsed.data : [],
      };
    } catch {
      return { storeUrl, listings: [] };
    }
  },
);
