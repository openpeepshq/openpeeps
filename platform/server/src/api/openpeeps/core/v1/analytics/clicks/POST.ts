import { endpoint } from '#lib/endpoint';
import {
  analyticsClicksIngestSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { recordClickEvents } from '@openpeepshq/core/analytics';

export const Input = analyticsClicksIngestSchema;
export const Output = successResponseSchema;

/** Anonymous and guest click ingest — no profile required. */
export const apiEndpoint = endpoint({ Input, Output }).handle(async (input) => {
  await recordClickEvents(input.events);
  return { success: true };
});
