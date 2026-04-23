import React, { useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { FormField, FormInput, FormCheckbox } from '../../../ui/form';
import { Button } from '../../../ui/button';
import { ThemedText } from '../../../ui/themed-text';
import { UseFormReturn } from 'react-hook-form';
import { PlusIcon, MinusIcon } from '../../../icons';
import { formatDateTime } from '../../../../lib/utils';
import { useTranslation } from 'react-i18next';
import { PostCreationData } from '@openpeeps/common';
import { DateSheet } from '../../modals/post/date-sheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

interface PollFormProps {
  form: UseFormReturn<PostCreationData>;
  postData: PostCreationData;
}

export const PollForm: React.FC<PollFormProps> = ({
  form,
  postData,
}) => {
  const options = postData.data.type === 'question' ? postData.data.options : [];
  const expiresAt = postData.data.type === 'question' ? postData.data.expiresAt : '';
  const { t } = useTranslation();
  const pollExpirationModalRef = useRef<BottomSheetModal>(null);
  const handlePollExpirationModal = () => {
    pollExpirationModalRef.current?.present();
  };

  return (
    <View className="px-4 pt-4 w-full flex flex-col gap-4">
      {options?.map((_, index) => (
        <View
          key={index}
          className="flex-row gap-x-1 items-center w-full">
          <FormField
            control={form.control}
            name={`data.options.${index}.content`}
            render={({ field }) => (
              <FormInput
                containerClassName="flex-grow"
                className="px-4 py-2 w-full rounded-lg"
                placeholder={t('posts.form.poll.option', { number: index + 1 })}
                {...field}
              />
            )}
          />
          <View className="flex-0 w-10">
            {index === options.length - 2 && options.length > 2 && (
              <Button
                onPress={() =>
                  form.setValue(
                    'data.options',
                    options.filter((_option, i) => i !== index),
                  )
                }

                variant={'ghost'}
                size={'sm'}>
                <MinusIcon size={20} className="text-foreground" />
              </Button>
            )}
            {index === options.length - 1 && (
              <Button
                onPress={() =>
                  form.setValue('data.options', [
                    ...options,
                    { type: 'note', content: '' },
                  ])
                }

                variant={'ghost'}
                size={'sm'}>
                <PlusIcon size={20} className="text-foreground" />
              </Button>
            )}
          </View>
        </View>
      ))}

      <View className="mt-6">
        <ThemedText className="text-base mb-2">{t('posts.form.poll.duration')}</ThemedText>

        <TouchableOpacity
          onPress={handlePollExpirationModal}
          className="h-14 px-4 border border-input rounded-lg justify-center">
          <ThemedText className="text-muted-foreground">
            {expiresAt
              ? formatDateTime(new Date(expiresAt))
              : '03/15/2025, 02:50 PM'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View className="flex w-full h-[38px] mt-2 relative flex-row items-center gap-3 pr-7">
        <FormField
          control={form.control}
          name="data.multiple"
          render={({ field }) => (
            <FormCheckbox
              checked={!!field.value}
              onCheckedChange={field.onChange}
              {...field}
              custom={false}
              label={t('posts.form.poll.multipleChoice')}
            />
          )}
        />
      </View>
      <View className="flex w-full h-[38px] mt-2 relative flex-row items-center gap-3 pr-7">
        <FormField
          control={form.control}
          name="data.votersVisible"
          render={({ field }) => (
            <FormCheckbox
              checked={!!field.value}
              onCheckedChange={field.onChange}
              {...field}
              custom={false}
              label={t('posts.form.poll.seeWhoVoted')}
            />
          )}
        />
      </View>

      <DateSheet
        ref={pollExpirationModalRef}
        value={expiresAt}
        onChange={dateString => {
          form.setValue('data.expiresAt', new Date(dateString).toISOString());
        }}
        onClose={() => pollExpirationModalRef.current?.close()}
      />

    </View>
  );
};
