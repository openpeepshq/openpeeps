import { endpoint } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { emailOptionsSchema, renderedEmailSchema } from '@openpeeps/common/types';
import { ensureServiceScope } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { emailService } from '@openpeeps/core/email';

export const Input = emailOptionsSchema;
export const Output = renderedEmailSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureServiceScope(event, undefined, {
      type: 'render',
      id: '*',
    });
    const emailOptions = emailOptionsSchema.parse(input);

    return emailService().then((es) => es.render(emailOptions));
  },
);
