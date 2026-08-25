import { Button } from '@openpeepshq/react-ui';
import { useT } from '../i18n';
import { type GuideIntent, useOnboardingGuide } from './useOnboardingGuide';

const SURFACE_COPY: Record<
  string,
  { body: string; cta: string; intent: GuideIntent }
> = {
  feed: {
    body: 'onboardingGuide.emptyFeed.body',
    cta: 'onboardingGuide.emptyFeed.cta',
    intent: 'suggest_people_or_posts',
  },
  groups: {
    body: 'onboardingGuide.emptyGroups.body',
    cta: 'onboardingGuide.emptyGroups.cta',
    intent: 'suggest_groups',
  },
  jams: {
    body: 'onboardingGuide.emptyJams.body',
    cta: 'onboardingGuide.emptyJams.cta',
    intent: 'suggest_jam',
  },
};

export const EmptyStateInvite = ({ surface }: { surface: string }) => {
  const t = useT();
  const guide = useOnboardingGuide();
  const copy = SURFACE_COPY[surface];
  if (!copy || !guide.shouldShowInvite(surface)) return null;

  return (
    <div className="border-border bg-surface max-w-md rounded-xl border p-4 text-center">
      <p className="text-sm">{t(copy.body, guide.tokens)}</p>
      <Button
        className="mt-3"
        size="sm"
        action={() => void guide.openGuide(copy.intent)}
      >
        {t(copy.cta, guide.tokens)}
      </Button>
    </div>
  );
};
