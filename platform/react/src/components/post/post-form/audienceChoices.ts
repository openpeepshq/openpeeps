import type { TFunction } from 'i18next';
import {
  Globe,
  UserCheck,
  Users,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';
import type {
  AuthorizationData,
  PostType,
  VisibilityType,
} from '@openpeepshq/common';
import {
  buildAudienceChoiceValues,
  type AudienceChoiceBase,
} from '../../../lib/audienceChoices';

export { audienceSummary } from '../../../lib/audienceChoices';

export interface AudienceChoice extends AudienceChoiceBase {
  icon: LucideIcon;
}

const icons: Record<VisibilityType, LucideIcon> = {
  public: Globe,
  local: WashingMachine,
  group: Users,
  direct: UserCheck,
  unlisted: Globe,
  private: UserCheck,
  report: UserCheck,
};

export function buildAudienceChoices(
  type: PostType,
  authData: AuthorizationData,
  t: TFunction,
  options: {
    publicContent?: boolean;
    showDirect?: boolean;
  } = {},
): AudienceChoice[] {
  return buildAudienceChoiceValues(type, authData, t, options).map(
    (choice) => ({ ...choice, icon: icons[choice.value] }),
  );
}
