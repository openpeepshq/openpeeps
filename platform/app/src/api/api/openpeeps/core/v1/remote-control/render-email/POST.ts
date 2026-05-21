import { Endpoint } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { emailOptionsSchema, renderedEmailSchema } from '@openpeeps/common/types';
import { ensureScope } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { emailService } from '@openpeeps/core/email';

export const Input = emailOptionsSchema;
export const Output = renderedEmailSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureScope(event, undefined, {
      type: 'render',
      id: '*',
    });
    const emailOptions = emailOptionsSchema.parse(input);

    return emailService().then((es) => es.render(emailOptions));
  },
);
