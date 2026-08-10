import { EmailRenderer } from '@openpeepshq/common/types';

export const registeredTemplates = new Map<string, EmailRenderer>();

export const registerEmailRenderer = (
  templateId: string,
  renderer: EmailRenderer,
) => {
  registeredTemplates.set(templateId, renderer);
};
