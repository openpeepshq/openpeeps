import React from 'react';
import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCommunityInfoPages } from '@openpeepshq/react';
import { AuthLayout } from '../components/layout';
import { OpenpeepsMarkdown } from '../components/markdown/index';
import { MainScreenProps } from '../components/navigation/types/index';
import { ThemedText } from '../components/ui/themed-text';

export const About: React.FC<MainScreenProps<'About'>> = () => {
  const { t } = useTranslation();
  const { communityName, aboutPage } = useCommunityInfoPages();

  return (
    <AuthLayout noRedirect>
      <ScrollView contentContainerClassName="p-4 pb-12">
        <ThemedText className="text-2xl font-bold pb-4">
          {t('about.welcomeTo', {
            defaultValue: `Welcome to ${communityName}`,
            name: communityName,
          })}
        </ThemedText>
        <OpenpeepsMarkdown source={aboutPage} />
      </ScrollView>
    </AuthLayout>
  );
};
