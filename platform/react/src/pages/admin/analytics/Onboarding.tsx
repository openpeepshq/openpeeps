import { AnalyticsBarChart, MetricCard, Table } from '@openpeepshq/react-ui';
import type { AnalyticsOnboardingStep } from '@openpeepshq/common/types';
import { useOpenpeeps, useT } from '../../../index';
import { AnalyticsLoading, AnalyticsSection } from './AnalyticsLayout';
import { useAnalyticsRangeContext } from './AnalyticsRangeContext';
import { columnHeader } from './analyticsInfo';
import { onboardingStepLabelKey } from './onboardingSteps';

export const AnalyticsOnboardingPage = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { queryParams } = useAnalyticsRangeContext();
  const onboarding = openpeepsApi.admin.useAnalyticsOnboarding(queryParams);

  if (onboarding.isLoading) return <AnalyticsLoading />;
  const data = onboarding.data;
  if (onboarding.isError) {
    return (
      <p className="text-muted-foreground text-sm">
        Failed to load onboarding analytics.
      </p>
    );
  }
  if (!data) return <AnalyticsLoading />;

  const thisPeriod = t('admin.analytics.period.thisPeriod', {
    defaultValue: 'This period',
  });
  // Interpolates `admin.analytics.info.${key}` — dynamic keys the i18n usage
  // scanner cannot grep, so the full set this page resolves is pinned in
  // Onboarding.test.tsx ("pins the dynamic info() keys against the en
  // locale"): onboardingCohortSize, onboardingCompletedAll, onboardingFunnel,
  // onboardingStepsTable, onboardingColumnStep, onboardingColumnCount,
  // onboardingColumnRate.
  const info = (key: string, defaultValue: string) =>
    t(`admin.analytics.info.${key}`, { defaultValue });

  // Reuse the member-facing Welcome checklist copy so admin wording matches
  // what members see on the welcome page. Every step maps to a key that
  // exists in both locales (pinned in onboardingSteps.test.ts), so the raw
  // step.label default can never surface.
  const stepLabel = (step: AnalyticsOnboardingStep): string =>
    t(onboardingStepLabelKey(step), { defaultValue: step.label });

  const steps = data.steps;
  const completedAllRate =
    data.cohortSize.value === 0
      ? 0
      : Math.round((data.completedAll.value / data.cohortSize.value) * 100);
  const chartData = steps.map((s) => ({
    label: stepLabel(s),
    value: s.count,
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('admin.analytics.onboarding.cohortSize', {
            defaultValue: 'New members in range',
          })}
          value={data.cohortSize.value}
          deltaPct={data.cohortSize.deltaPct}
          subtitle={thisPeriod}
          info={info(
            'onboardingCohortSize',
            'Local, non-deleted member profiles created during the selected range. Every onboarding rate is a share of this cohort.',
          )}
        />
        <MetricCard
          label={t('admin.analytics.onboarding.completedAll', {
            defaultValue: 'Completed all steps',
          })}
          value={data.completedAll.value}
          deltaPct={data.completedAll.deltaPct}
          subtitle={`${thisPeriod} (${completedAllRate}%)`}
          info={info(
            'onboardingCompletedAll',
            'Members in the cohort who have completed all onboarding steps tracked here. The percentage is their share of the cohort.',
          )}
        />
      </div>

      <AnalyticsSection
        title={t('admin.analytics.onboarding.funnel', {
          defaultValue: 'Onboarding funnel',
        })}
        info={info(
          'onboardingFunnel',
          'How many of the members who joined in the selected range have completed each Welcome checklist step. Steps reflect current member state, not completion over time.',
        )}
        csvFilename="onboarding-funnel.csv"
        csvRows={[
          ['step', 'label', 'count', 'rate'],
          ...steps.map((s) => [s.key, stepLabel(s), s.count, s.rate]),
        ]}
      >
        <AnalyticsBarChart data={chartData} height={260} />
      </AnalyticsSection>

      <AnalyticsSection
        collapsible
        title={t('admin.analytics.onboarding.stepsTable', {
          defaultValue: 'Steps',
        })}
        info={info(
          'onboardingStepsTable',
          'Per-step completion counts and rates for the cohort, in Welcome checklist order.',
        )}
        csvFilename="onboarding-steps.csv"
        csvRows={[
          ['step', 'count', 'rate'],
          ...steps.map((s) => [s.key, s.count, s.rate]),
        ]}
      >
        <Table
          data={steps}
          columnDefinitions={[
            {
              id: 'step',
              type: 'text',
              header: columnHeader(
                t('admin.analytics.onboarding.columnStep', {
                  defaultValue: 'Step',
                }),
                info(
                  'onboardingColumnStep',
                  'A Welcome checklist step, in the order members are prompted to complete it.',
                ),
              ),
              render: (s: AnalyticsOnboardingStep) => stepLabel(s),
            },
            {
              id: 'count',
              type: 'property',
              header: columnHeader(
                t('admin.analytics.onboarding.columnCount', {
                  defaultValue: 'Members',
                }),
                info(
                  'onboardingColumnCount',
                  'Members in the cohort who have completed the step.',
                ),
              ),
            },
            {
              id: 'rate',
              type: 'text',
              header: columnHeader(
                t('admin.analytics.onboarding.columnRate', {
                  defaultValue: 'Rate',
                }),
                info(
                  'onboardingColumnRate',
                  'Share of the cohort that has completed the step, as a percentage.',
                ),
              ),
              render: (s: AnalyticsOnboardingStep) => `${s.rate}%`,
            },
          ]}
        />
      </AnalyticsSection>
    </div>
  );
};
