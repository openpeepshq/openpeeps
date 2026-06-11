import { useState } from 'react';
import { collectVotes, hasValue, type PublicPost } from '@openpeeps/common';
import { checkPostCapabilities, groupName } from '@openpeeps/common/lib';

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
import { Button } from '@openpeeps/react-ui';

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
  const [submitting, setSubmitting] = useState(false);

  if (post.data?.type !== 'question') return null;

  const pollData = post.data;
  const { votes, voteCounts } = collectVotes(post);
  const hasPollEnded = !!(pollData.expiresAt && isPast(pollData.expiresAt));
  const hasVoted = !!(
    currentProfile &&
    (votes.find((v) => v?.profile?.id === currentProfile.id)?.selection
      ?.length ?? 0) > 0
  );
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
    setSubmitting(true);
    try {
      await votePoll({ selection });
      success(
        t('posts.vote.successToast', {
          defaultValue: 'Your vote was counted.',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearVote = async () => {
    setSubmitting(true);
    try {
      await votePoll({ selection: [] });
      success(
        t('posts.vote.cleared', { defaultValue: 'Your vote was cleared.' }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-100 rounded-lg px-4 py-4">
      <div className="space-y-4">
        {pollData.options.map((option, index) => (
          <div
            key={`${option.content}-${index}`}
            className="flex items-center gap-2 py-2"
          >
            {canVote ? (
              pollData.multiple ? (
                <input
                  type="checkbox"
                  checked={selectedPollOptions.includes(index)}
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
                  name={`poll-${post.id}`}
                  checked={selectedPollOption === index}
                  onChange={() => setSelectedPollOption(index)}
                />
              )
            ) : null}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base">{option.content}</span>
                <div className="flex items-center gap-2">
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
                  <span>{voteCounts?.[index] ?? 0}</span>
                </div>
              </div>
              <div className="bg-surface-300 mt-2 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{
                    width: `${((voteCounts[index] ?? 0) / totalVotes) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {canVote ? (
        <Button
          variant="variant-filled-primary"
          className="mt-4"
          action={handleVote}
          disabled={submitting}
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
          <button
            type="button"
            className="text-primary font-semibold"
            onClick={() => void handleClearVote()}
          >
            {t('posts.poll.undoVote', { defaultValue: 'Undo vote' })}
          </button>
        ) : null}
      </div>
    </div>
  );
}
