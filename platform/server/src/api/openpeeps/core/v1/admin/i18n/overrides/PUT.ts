import { endpoint, z } from '#lib/endpoint';
import { notFound } from '#lib/errors';
import { updateI18nOverrides } from '@openpeepshq/core/i18n';
import { successResponseSchema } from '@openpeepshq/common';
import { ensureRoleCapabilities } from '#lib/auth';
import { auditAction } from '#lib/audit';

export const Output = successResponseSchema;
export const Input = z
  .object({
    en: z.any(),
  })
  .openapi({ type: 'object' });

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-i18n-update']);
    await updateI18nOverrides(input);

    if (event.context.currentProfile) {
      // The full override content is personal-data-adjacent and bulky; log
      // the count of changed strings instead.
      const changed =
        input?.en && typeof input.en === 'object'
          ? Object.keys(input.en).length
          : 0;
      void auditAction(event, event.context.currentProfile, {
        action: 'i18n.update',
        targetType: 'config',
        targetId: 'i18n.overrides',
        targetLabel: 'i18n overrides (en)',
        metadata: { changedStringCount: changed },
      });
    }

    return { success: true };
  },
);
