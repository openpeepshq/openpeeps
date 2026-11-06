import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  pluginStoreCatalogSchema,
  pluginStoreListingSchema,
} from '@openpeepshq/common/types';
import { defaultConfig } from '@openpeepshq/core/config';
import { badGateway, forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';

const STORE_CATALOG_TIMEOUT_MS = 10_000;

export const Output = pluginStoreCatalogSchema;

export const Error = {
  403: forbidden(),
  502: badGateway(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-plugins-manage']);
    const storeUrl = (await defaultConfig).plugins.storeUrl;
    if (!storeUrl) {
      return { storeUrl: undefined, listings: [] };
    }
    let response: Response;
    try {
      response = await fetch(`${storeUrl.replace(/\/$/, '')}/v1/listings`, {
        signal: AbortSignal.timeout(STORE_CATALOG_TIMEOUT_MS),
      });
    } catch {
      throw badGateway('Plugin store is unreachable.');
    }
    if (!response.ok) {
      throw badGateway(
        `Plugin store catalog request failed (${response.status}).`,
      );
    }
    const parsed = pluginStoreListingSchema
      .array()
      .safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) {
      throw badGateway('Plugin store catalog response was malformed.');
    }
    return {
      storeUrl,
      listings: parsed.data,
    };
  },
);
