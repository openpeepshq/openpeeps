import React from 'react';
import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCommunityInfoPages } from '@openpeepshq/react';
import { GenericHeader } from '../components/custom/index';
import { OpenpeepsMarkdown } from '../components/markdown/index';
import { MainScreenProps } from '../components/navigation/types/index';
import { ThemedSafeAreaView } from '../components/ui/themed-safe-area-view';

export const CodeOfConduct: React.FC<MainScreenProps<'CodeOfConduct'>> = () => {
  const { t } = useTranslation();
  const { codeOfConduct } = useCommunityInfoPages();

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('codeOfConduct.title', { defaultValue: 'Code of conduct' })}
      />
      <ScrollView contentContainerClassName="p-4 pb-12">
        <OpenpeepsMarkdown source={codeOfConduct} />
      </ScrollView>
    </ThemedSafeAreaView>
  );
};
