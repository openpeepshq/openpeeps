import { Heading, Text } from '@react-email/components';
import type { EmailGlobals } from '@openpeepshq/common/types';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Props {
  globals: EmailGlobals;
  periodFrom: string;
  periodTo: string;
  reportText: string;
}

export const AnalyticsMonthlyReport = ({
  globals,
  periodFrom,
  periodTo,
  reportText,
}: Props) => (
  <BaseEmailLayout
    globals={globals}
    previewText={`Monthly analytics ${periodFrom}–${periodTo}`}
  >
    <Heading style={emailStyles.heading}>
      Monthly analytics — {globals.communityConfig.info.name}
    </Heading>
    <Text style={emailStyles.paragraph}>
      Period: {periodFrom} → {periodTo}
    </Text>
    <Text
      style={{
        ...emailStyles.paragraph,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        whiteSpace: 'pre-wrap',
        fontSize: '13px',
      }}
    >
      {reportText}
    </Text>
  </BaseEmailLayout>
);
