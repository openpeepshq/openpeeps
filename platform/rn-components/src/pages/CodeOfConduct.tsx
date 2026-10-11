import React from 'react';
import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCommunityInfoPages } from '@openpeepshq/react';
import { AuthLayout } from '../components/layout';
import { OpenpeepsMarkdown } from '../components/markdown/index';
import { MainScreenProps } from '../components/navigation/types/index';
import { ThemedText } from '../components/ui/themed-text';

export const CodeOfConduct: React.FC<MainScreenProps<'CodeOfConduct'>> = () => {
  const { t } = useTranslation();
  const { codeOfConduct } = useCommunityInfoPages();

  return (
    <AuthLayout noRedirect>
      <ScrollView contentContainerClassName="p-4 pb-12">
        <ThemedText className="text-2xl font-bold pb-4">
          {t('codeOfConduct.title', { defaultValue: 'Code of conduct' })}
        </ThemedText>
        <OpenpeepsMarkdown source={codeOfConduct} />
      </ScrollView>
    </AuthLayout>
  );
};
