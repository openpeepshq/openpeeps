import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedText as Text } from '~/components/ui/themed-text';
import { hasValue, type PublicPost } from '@openpeeps/common';
import { collectVotes } from '@openpeeps/common';
import { formatDistanceToNow, isPast } from 'date-fns';
import { Progress } from '~/components/ui/progress';
import { useOpenpeeps } from '@openpeeps/react';
import Toast from 'react-native-toast-message';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { useTranslation } from 'react-i18next';
import { ProfileAvatar } from '~/components/custom/profile/profile-avatar';

interface Props {
  post: PublicPost;
}

export const PollContent = ({ post }: Props) => {
  const { t } = useTranslation();
  const [selectedPollOption, setSelectedPollOption] = useState<number>();
  const [selectedPollOptions, setSelectedPollOptions] = useState<number[]>([]);

  const { openpeepsApi, currentProfile } = useOpenpeeps();

  const { votes, voteCounts } = collectVotes(post);

  const votePoll = openpeepsApi.voteOnPostAction({ id: post!.id });

  let hasPollEnded: boolean = !!(
    post?.data?.type === 'question' &&
    post.data.expiresAt &&
    isPast(post.data.expiresAt)
  );

  let hasVoted: boolean = !!(
    currentProfile &&
    (votes.find(v => v?.profile?.id === currentProfile.id)?.selection
      ?.length ?? 0) > 0
  );

  let canVote: boolean = !!(currentProfile && !hasPollEnded && !hasVoted);

  const handleVote = async () => {
    if (post?.data?.type !== 'question') {
      return;
    }

    const selection = (post?.data.multiple
      ? selectedPollOptions
      : hasValue(selectedPollOption)
        ? [selectedPollOption]
        : undefined) as number[];
    if (selection && selection.length > 0) {
      try {
        await votePoll({
          selection,
        });
        Toast.show({
          type: 'success',
          text1: t('posts.vote.success'),
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: t('posts.vote.error'),
          text2:
            error instanceof Error ? error.message : t('common.errors.error'),
        });
      }
    } else {
      Toast.show({
        type: 'error',
        text1: t('posts.poll.selectOption'),
      });
    }
  };

  const handleClearVote = async () => {
    if (post?.data?.type !== 'question') {
      return;
    }

    try {
      await votePoll({
        selection: [],
      });
      Toast.show({
        type: 'success',
        text1: t('posts.poll.undoVote'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('posts.vote.error'),
        text2:
          error instanceof Error ? error.message : t('common.errors.error'),
      });
    }
  };

  return (
    <View className="bg-card rounded-lg px-4 py-4">
      <View className="gap-4">
        {post?.data?.type === 'question' &&
          post.data.options.map((option, index) => (
            <View
              key={`${option.content}-${index}`}
              className="flex-row items-center gap-2 py-2">
              {canVote && (
                <>
                  {post?.data?.type === 'question' && post.data.multiple ? (
                    <Checkbox
                      checked={selectedPollOptions.includes(index)}
                      onCheckedChange={() => {
                        setSelectedPollOptions(prev => {
                          if (prev.includes(index)) {
                            return prev.filter(i => i !== index);
                          }
                          return [...prev, index];
                        });
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setSelectedPollOption(index)}
                      className="flex-row items-center gap-2">
                      <View className="h-5 w-5 rounded-full border border-muted-foreground justify-center items-center">
                        {selectedPollOption === index && (
                          <View className="h-3 w-3 rounded-full bg-primary" />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              )}
              <View className="flex-1">
                <View className="flex-row justify-between items-center">
                  <Text className="text-base">{option.content}</Text>
                  <View className="flex-row items-center gap-2">
                    {post?.data?.type === 'question' &&
                      post.data.votersVisible && (
                        <View className="flex-row">
                          {votes
                            .filter(v => v.selection.includes(index))
                            .slice(0, 2)
                            .map(vote => (
                              <View
                                key={`${vote.profile.displayName}-${vote.profile.id}`}
                                className="-ml-4">
                                <ProfileAvatar
                                  profile={vote.profile}
                                  className="size-6"
                                />
                              </View>
                            ))}
                        </View>
                      )}
                    <Text>{voteCounts?.[index] ?? 0}</Text>
                  </View>
                </View>
                <Progress
                  value={
                    ((voteCounts[index] ?? 0) /
                      (votes.length || 1)) *
                    100
                  }
                  className="mt-2"
                />
              </View>
            </View>
          ))}
      </View>

      {canVote && (
        <Button variant="outline" className="mt-4 w-32" onPress={handleVote}>
          <Text>{t('posts.form.poll.submit')}</Text>
        </Button>
      )}

      <View className="mt-4 flex-row items-center gap-3">
        <Text className="text-sm text-muted-foreground">
          {`${votes.length || 0} ${t('posts.vote.count')}`}
        </Text>
        {post?.data?.type === 'question' && post.data.expiresAt && (
          <Text className="text-sm text-muted-foreground">
            {hasPollEnded
              ? t('posts.poll.ended')
              : `${formatDistanceToNow(post.data.expiresAt)} ${t(
                'posts.poll.timeLeft',
              )}`}
          </Text>
        )}
        {hasVoted && !hasPollEnded && (
          <TouchableOpacity onPress={handleClearVote}>
            <Text className="text-primary font-semibold">
              {t('posts.poll.undoVote')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
