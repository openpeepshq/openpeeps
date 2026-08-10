import type { EmailOptionsWithGlobals } from '@openpeepshq/common/types';

import type { ReactEmailTemplate } from '../../types';
import { ResetPassword } from './ResetPassword';

interface Locals {
  resetPasswordLink: string;
}

const renderSubject = async (
  props: EmailOptionsWithGlobals,
): Promise<string> =>
  `Reset your password for ${props.globals.communityConfig.info.name}!`;

const template: ReactEmailTemplate<Locals> = {
  component: ResetPassword,
  renderSubject,
};

export default template;
