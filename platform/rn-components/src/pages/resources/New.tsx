import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNewResource } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { Button } from '../../components/ui/button';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ResourceForm } from '../../components/post/index';

type NewResourceProps = MainScreenProps<'NewResource'>;

export const NewResource: React.FC<NewResourceProps> = () => {
  const { t } = useTranslation();
  const {
    postData,
    setPostData,
    canSubmit,
    groupOnly,
    submitting,
    error,
    clearError,
    submit,
  } = useNewResource();

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  // Direct messages can't be drafts (error.draftNotDirect). A derived boolean
  // keeps `headerActions` referentially stable — using `postData` directly
  // would re-fire useSetPageHeader on every keystroke.
  const isDirect = postData.visibility === 'direct';

  const headerActions = React.useMemo(
    () => (
      <>
        <Button
          variant="ghost"
          className="mr-1"
          testID="resources-save-draft"
          onPress={() => submit(true)}
          disabled={submitting || !canSubmit || isDirect}
        >
          <ThemedText>
            {t('posts.create.saveDraft', { defaultValue: 'Save draft' })}
          </ThemedText>
        </Button>
        <Button
          onPress={() => submit()}
          disabled={submitting || !canSubmit}
          testID="resources-submit"
        >
          <ThemedText className="text-primary-foreground font-semibold">
            {submitting
              ? t('common.submitting', { defaultValue: 'Submitting…' })
              : t('resources.create.title', {
                  defaultValue: 'Create resource',
                })}
          </ThemedText>
        </Button>
      </>
    ),
    [canSubmit, submit, submitting, isDirect, t]
  );

  useSetPageHeader(
    t('resources.new', { defaultValue: 'New resource' }),
    headerActions
  );

  return (
    <ThemedView className="flex-1">
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="pb-12"
      >
        <ResourceForm
          postData={postData}
          onChange={setPostData}
          groupOnly={groupOnly}
        />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
