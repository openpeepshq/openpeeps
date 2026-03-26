import { EmailRenderer } from '@openpeeps/common/types';

export const registeredTemplates = new Map<string, EmailRenderer>();

export const registerEmailRenderer = (
  templateId: string,
  renderer: EmailRenderer,
) => {
  registeredTemplates.set(templateId, renderer);
};
