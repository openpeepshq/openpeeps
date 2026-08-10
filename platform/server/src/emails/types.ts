import type { ComponentType } from 'react';
import type {
  EmailGlobals,
  EmailOptionsWithGlobals,
} from '@openpeepshq/common/types';

export interface ReactEmailTemplate<Locals = unknown> {
  component: ComponentType<{ globals: EmailGlobals; locals: Locals }>;
  renderSubject: (
    props: EmailOptionsWithGlobals & { locals: Locals },
  ) => Promise<string> | string;
}
