import { View } from 'react-native';
import React, { forwardRef, useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '~/components/ui/themed-text';
import { PublicPost, Profile, ReportCreationData, reportCreationDataSchema } from '@openpeeps/common';
import { useTranslation } from 'react-i18next';
import { BaseSheet, SheetFooter } from '../modals';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormRadioGroup } from '~/components/ui/form';
import Toast from 'react-native-toast-message';
import { useForm } from 'react-hook-form';
import { useOpenpeeps } from '@openpeeps/react';
import { ThemedView } from '~/components/ui/themed-view';
import { RadioGroupItem } from '~/components/ui/radio-group';
import { TextInput } from 'react-native';
import { cn } from '~/lib/utils';
import { Label } from '~/components/ui/label';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface ReportProfileOrPostSheetProps {
  reportCallback?: () => void | undefined;
  profile?: Profile | undefined;
  post?: PublicPost | undefined;
  reportType?: 'profile' | 'post';
}

export const ReportProfileOrPostSheet = forwardRef<
  BottomSheetModal,
  ReportProfileOrPostSheetProps
>(({ reportType, profile, post, reportCallback }, ref) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const { data: server } = openpeepsApi.useServerInfo();
  const reportMutation = openpeepsApi.createReportAction();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportCategories: {
    value: 'spam' | 'other' | 'violation';
    label: string;
  }[] = [
      {
        value: 'spam',
        label: t('reports.categories.spamDescription'),
      },
      {
        value: 'violation',
        label: t('reports.categories.violationDescription'),
      },
      {
        value: 'other',
        label: t('reports.categories.otherDescription'),
      },
    ];

  const form = useForm({
    resolver: zodResolver(reportCreationDataSchema),
    defaultValues: {
      report: {
        comment: '',
        category: 'spam',
        forward: false,
      },
      profileId: reportType === 'profile' ? profile?.id : post?.profile.id,
      postIds: reportType === 'post' ? [post?.id] : [],
    },
  });

  const onSubmit = async (values: ReportCreationData) => {
    setIsSubmitting(true);
    reportMutation(values)
      .then(async response => {
        console.log(':response', response);
        Toast.show({
          type: 'success',
          text2: t('reports.create.reportSuccess', {
            name: server?.communityConfig.info.name,
          }),
        });
        if (reportCallback) {
          reportCallback();
        }
        bottomSheetClose(ref);
      })
      .catch(err => {
        console.log('response', err);
        Toast.show({
          type: 'error',
          text1: t('common.errors.error'),
          text2: err.message,
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };
  const handleSubmit = async () => {
    const values = form.getValues();
    await onSubmit(values as ReportCreationData);
  };

  return (
    <BaseSheet ref={ref}>
      {currentStep === 1 && (
        <View className="flex-1 justify-between p-4">
          <Form {...form}>
            <View className="w-full">
              <ThemedText className="text-center text-lg my-2">
                {reportType === 'profile'
                  ? t('reports.create.profile.title', {
                    handle: `@${profile?.handle}`,
                  })
                  : t('reports.create.post.title')}
              </ThemedText>
            </View>
            <View className="items-center justify-center">
              <ThemedText className="p-4 text-muted-foreground text-center">
                {t(`reports.create.${reportType}.description`)}
              </ThemedText>
            </View>
            <ThemedView className="relative w-full">
              <FormField
                control={form.control}
                name="report.category"
                render={({ field }) => (
                  <>
                    {reportCategories.map((category, index) => (
                      <FormRadioGroup
                        key={index}
                        {...field}
                        className="rounded-md w-full"
                        value={field.value ?? category.value}
                        onValueChange={field.onChange}>
                        <ThemedView className="flex flex-row items-center gap-x-2 mb-2 flex-wrap">
                          <RadioGroupItem value={category.value} />
                          <ThemedText className="text-wrap">
                            {category.label}
                          </ThemedText>
                        </ThemedView>
                      </FormRadioGroup>
                    ))}
                  </>
                )}
              />
            </ThemedView>
            <ThemedView className="relative w-full mt-4">
              <FormField
                control={form.control}
                name="report.comment"
                render={({ field }) => (
                  <>
                    <Label
                      className="text-lg text-foreground mt-2 mb-2"
                      htmlFor="report.comment">
                      {t(`reports.create.${reportType}.anythingElse`)}
                    </Label>
                    <TextInput
                      className={cn(
                        'p-4 text-lg text-foreground border-muted-foreground/25 border-[1px] rounded-md w-full h-36',
                      )}
                      placeholder={t(
                        `reports.create.${reportType}.anythingElse`,
                      )}
                      placeholderTextColor="#666"
                      multiline
                      {...field}
                      // value={field.value || ''}
                      onChangeText={field.onChange}
                      maxLength={500}
                    />
                  </>
                )}
              />
            </ThemedView>
          </Form>
          <SheetFooter
            onCancel={() => bottomSheetClose(ref)}
            onConfirm={() => {
              setCurrentStep(2);
            }}
            confirmText={t(`reports.create.${reportType}.continue`)}
          />
        </View>
      )}
      {currentStep === 2 && (
        <View className="flex-1 justify-between p-4">
          <View className="w-full">
            <ThemedText className="text-center text-lg my-2">
              {t(`reports.create.${reportType}.confirmMessageHeading`, {
                handle: profile?.handle || post?.profile.handle,
              })}
            </ThemedText>
          </View>
          {reportType === 'profile' && (
            <View className="items-center justify-center">
              <ThemedText className="p-4 text-center">
                {t('reports.create.profile.confirmMessageDescription', {
                  handle: profile?.handle,
                })}
              </ThemedText>
            </View>
          )}

          <SheetFooter
            cancelText="Back"
            onCancel={() => {
              setCurrentStep(1);
            }}
            onConfirm={handleSubmit}
            confirmVariant={'destructive'}
            confirmText={
              isSubmitting
                ? t('common.form.loading')
                : t('reports.create.sendReport')
            }
          />
        </View>
      )}
    </BaseSheet>
  );
});
