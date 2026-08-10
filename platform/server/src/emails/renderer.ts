import { createElement } from 'react';
import { render } from '@react-email/render';
import type {
  EmailOptionsWithGlobals,
  EmailRenderer,
} from '@openpeepshq/common/types';

import type { ReactEmailTemplate } from './types';

export const reactEmailRenderer =
  <Locals>(template: ReactEmailTemplate<Locals>): EmailRenderer =>
  async (emailOptions: EmailOptionsWithGlobals) => {
    const typed = emailOptions as EmailOptionsWithGlobals & { locals: Locals };

    const html = await render(
      createElement(template.component, {
        globals: typed.globals,
        locals: typed.locals,
      }),
    );

    const subject = await Promise.resolve(template.renderSubject(typed));

    return { html, subject };
  };
