import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { livekitDiagnosisSchema } from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { diagnoseLivekit } from '@openpeepshq/core/jams';

export const Output = livekitDiagnosisSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-read']);

    return diagnoseLivekit();
  },
);
