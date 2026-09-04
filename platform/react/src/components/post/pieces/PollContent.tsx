import { useState, type MouseEvent } from 'react';
import { collectVotes, hasValue, type PublicPost } from '@openpeepshq/common';
import { checkPostCapabilities, groupName } from '@openpeepshq/common/lib';

const isPast = (date: Date | string) => new Date(date).getTime() < Date.now();

const formatDistanceToNow = (date: Date | string) => {
  const target = new Date(date).getTime();
  const seconds = Math.round((target - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86400), 'day');
};
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useToast } from '../../layout/ToastProvider';
import { useCapabilities } from '../../server-data';
import { Avatar } from '../../profile';
import { Button, cn } from '@openpeepshq/react-ui';

export interface PollContentProps {
  post: PublicPost;
}

export function PollContent({ post }: PollContentProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const { success, error } = useToast();
  const votePoll = openpeepsApi.voteOnPostAction({ id: post.id });

  const [selectedPollOption, setSelectedPollOption] = useState<number>();
  const [selectedPollOptions, setSelectedPollOptions] = useState<number[]>([]);

  if (post.data?.type !== 'question') return null;

  const pollData = post.data;
  const { votes, voteCounts } = collectVotes(post);
  const hasPollEnded = !!(pollData.expiresAt && isPast(pollData.expiresAt));
  const ownSelection = currentProfile
    ? (votes.find((v) => v?.profile?.id === currentProfile.id)?.selection ?? [])
    : [];
  const hasVoted = ownSelection.length > 0;
  const canVote = !!(currentProfile && !hasPollEnded && !hasVoted);
  const totalVotes = votes.length || 1;

  const handleVote = async () => {
    const hasCapabilities = checkPostCapabilities(
      authData,
      ['core-posts-vote'],
      post,
      capabilities,
    );

    if (!hasCapabilities.success) {
      error(
        post.group
          ? t('posts.vote.lackPermission', {
              defaultValue: 'You need to be a member of {{groupName}} to vote.',
              groupName: groupName(post.group),
            })
          : t('posts.vote.lackPermissionNoGroup', {
              defaultValue: 'You do not have permission to vote on this poll.',
            }),
      );
      return;
    }

    const selection = (
      pollData.multiple
        ? selectedPollOptions
        : hasValue(selectedPollOption)
          ? [selectedPollOption]
          : undefined
    ) as number[] | undefined;

    if (!selection?.length) {
      error(
        t('posts.vote.selectOption', {
          defaultValue: 'Please select an option to vote.',
        }),
      );
      return;
    }
    try {
      await votePoll({ selection });
      success(
        t('posts.vote.successToast', {
          defaultValue: 'Your vote was counted.',
        }),
      );
    } catch {
      error(
        t('posts.vote.error', {
          defaultValue: 'Could not update your vote. Please try again.',
        }),
      );
    }
  };

  const handleClearVote = async () => {
    try {
      await votePoll({ selection: [] });
      success(
        t('posts.vote.cleared', { defaultValue: 'Your vote was cleared.' }),
      );
    } catch {
      error(
        t('posts.vote.error', {
          defaultValue: 'Could not update your vote. Please try again.',
        }),
      );
    }
  };

  // The feed wraps each post in a link, so clicks inside the poll must not
  // reach it. Clicks on the option controls are exempt: cancelling those
  // reverts the checkbox/radio the browser just ticked, so a pending selection
  // would never show. They are their own activation target, so the surrounding
  // link does not navigate. Key events only stop propagation for the same
  // reason — cancelling them swallows keyboard activation.
  const stopFeedNavigation = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target?.closest('input,label')) e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="bg-surface rounded-lg px-4 py-4"
      onClick={stopFeedNavigation}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <div className="space-y-4">
        {pollData.options.map((option, index) => {
          const optionId = `poll-${post.id}-option-${index}`;
          const isOwnChoice = ownSelection.includes(index);
          // Kept visible (checked, disabled) once the viewer has voted so their
          // own selection stays readable while the results show.
          const hasControl = canVote || hasVoted;
          const labelClass = cn(
            'min-w-0 text-base',
            isOwnChoice && 'font-medium',
            canVote && 'cursor-pointer',
          );

          const voteCount = voteCounts[index] ?? 0;
          const votePercent = (voteCount / totalVotes) * 100;

          return (
            <div
              key={`${option.content}-${index}`}
              className="flex items-center gap-2 py-2"
            >
              {hasControl ? (
                pollData.multiple ? (
                  <input
                    type="checkbox"
                    id={optionId}
                    disabled={!canVote}
                    checked={
                      canVote
                        ? selectedPollOptions.includes(index)
                        : isOwnChoice
                    }
                    onChange={() =>
                      setSelectedPollOptions((prev) =>
                        prev.includes(index)
                          ? prev.filter((i) => i !== index)
                          : [...prev, index],
                      )
                    }
                  />
                ) : (
                  <input
                    type="radio"
                    id={optionId}
                    name={`poll-${post.id}`}
                    disabled={!canVote}
                    checked={
                      canVote ? selectedPollOption === index : isOwnChoice
                    }
                    onChange={() => setSelectedPollOption(index)}
                  />
                )
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  {hasControl ? (
                    <label htmlFor={optionId} className={labelClass}>
                      {option.content}
                    </label>
                  ) : (
                    <span className={labelClass}>{option.content}</span>
                  )}
                  <div className="flex shrink-0 items-center gap-2">
                    {pollData.votersVisible ? (
                      <div className="flex -space-x-2">
                        {votes
                          .filter((v) => v.selection.includes(index))
                          .slice(0, 2)
                          .map((vote) => (
                            <Avatar
                              key={vote.profile.id}
                              profile={vote.profile}
                              size={1.5}
                            />
                          ))}
                      </div>
                    ) : null}
                    <span>{voteCount}</span>
                  </div>
                </div>
                <div className="bg-surface-2 mt-2 h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      // 0% would be invisible; 8px matches h-2 so a 0-vote
                      // fill is a circle at the start of the track.
                      width: votePercent === 0 ? 8 : `${votePercent}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canVote ? (
        <Button
          variant="default"
          className="mt-4"
          title={t('posts.poll.vote', { defaultValue: 'Vote' })}
          action={handleVote}
        >
          {t('posts.form.poll.submit', { defaultValue: 'Vote' })}
        </Button>
      ) : null}

      <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span>
          {votes.length || 0} {t('posts.vote.count', { defaultValue: 'votes' })}
        </span>
        {pollData.expiresAt ? (
          <span>
            {hasPollEnded
              ? t('posts.poll.ended', { defaultValue: 'Poll ended' })
              : `${formatDistanceToNow(pollData.expiresAt)} ${t('posts.poll.timeLeft', { defaultValue: 'left' })}`}
          </span>
        ) : null}
        {hasVoted && !hasPollEnded ? (
          <Button
            variant="ghost"
            className="h-auto min-h-0 px-0 font-semibold"
            title={t('posts.poll.undoVoteTitle', {
              defaultValue: 'Undo your vote',
            })}
            action={handleClearVote}
          >
            {t('posts.poll.undoVote', { defaultValue: 'Undo vote' })}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
