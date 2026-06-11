import { Image } from 'lucide-react';
import type { PublicPost } from '@openpeeps/common/types';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { Avatar } from '../profile';
import { useReplyModal } from './post-form/ReplyModalContext';
import { useSignUpLoginModal } from '../accounts/SignUpLoginModalContext';

export interface ReplyBoxProps {
  post: PublicPost;
}

export function ReplyBox({ post }: ReplyBoxProps) {
  const t = useT();
  const profile = useCurrentProfile();
  const { openReply } = useReplyModal();
  const { openSignUpLogin } = useSignUpLoginModal();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (profile) {
      openReply(post);
    } else {
      openSignUpLogin();
    }
  };

  return (
    <button
      type="button"
      title={
        profile
          ? t('posts.replyBox.reply', { defaultValue: 'Reply' })
          : t('posts.replyBox.logInToReply', {
              defaultValue: 'Log in to reply',
            })
      }
      onClick={handleClick}
      className="flex w-full items-center gap-x-2 border-b-2 p-5"
    >
      <Avatar profile={profile} size={2.5} />
      <span className="bg-surface-200 hover:bg-surface-300 flex h-max w-full items-center justify-between rounded-full border-b border-t p-5">
        <span>
          {t('posts.replyBox.addReplyPlaceholder', {
            defaultValue: 'Add a reply…',
          })}
        </span>
        <Image size={24} />
      </span>
    </button>
  );
}
