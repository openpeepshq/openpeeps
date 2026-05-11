import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

import type { ReactEmailTemplate } from '../../types';
import { ValidateEmail } from './ValidateEmail';

interface Locals {
  emailValidationLink: string;
}

const renderSubject = async (
  props: EmailOptionsWithGlobals,
): Promise<string> =>
  `Validate your email for ${props.globals.communityConfig.info.name}!`;

const template: ReactEmailTemplate<Locals> = {
  component: ValidateEmail,
  renderSubject,
};

export default template;
