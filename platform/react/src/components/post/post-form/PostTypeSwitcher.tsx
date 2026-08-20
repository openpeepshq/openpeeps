import {
  CalendarDays,
  ChartColumnBig,
  Notebook,
  ScrollText,
} from 'lucide-react';
import type { PostType, VisibilityType } from '@openpeepshq/common/types';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useNavigate } from '../../../contexts/router';
import { getNewPostStores } from '../../../stores/newPosts';
import { useCurrentProfile } from '../../layout/IdentityContext';

export interface PostTypeSwitcherProps {
  type: PostType;
  /** Switch the in-modal composer between the note and poll forms. */
  onSelect: (type: 'note' | 'question') => void;
  /** Dismiss the modal before navigating to a full-page composer. */
  onClose: () => void;
  showEventType?: boolean;
  showArticleType?: boolean;
  /** Current composer audience, carried into article/event pages. */
  visibility?: VisibilityType;
  groupId?: string;
}

/**
 * Icon switcher mirroring the Svelte `PostTypeSwitcher`. Note and poll swap the
 * in-modal form; event and article navigate to their dedicated pages (events
 * are gated to community owners, matching the Svelte role check).
 */
export function PostTypeSwitcher({
  type,
  onSelect,
  onClose,
  showEventType = true,
  showArticleType = true,
  visibility,
  groupId,
}: PostTypeSwitcherProps) {
  const t = useT();
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const isOwner = Boolean(me?.roles?.some((role) => role.key === 'owner'));

  const goto = (path: '/articles/new' | '/events/new') => {
    const stores = getNewPostStores();
    if (path === '/articles/new') {
      stores.article = {
        ...stores.article,
        type: 'article',
        visibility: visibility ?? stores.article.visibility,
        groupId,
      };
    } else {
      stores.event = {
        ...stores.event,
        type: 'event',
        visibility: visibility ?? stores.event.visibility,
        groupId,
      };
    }
    onClose();
    navigate(path);
  };

  return (
    <div className="flex items-center gap-1">
      {type !== 'note' ? (
        <Button
          compact
          variant="ghost"
          title={t('posts.switcher.note', { defaultValue: 'Write Note' })}
          action={() => onSelect('note')}
        >
          <Notebook className="size-5" />
        </Button>
      ) : null}
      {type !== 'question' ? (
        <Button
          compact
          variant="ghost"
          title={t('posts.switcher.poll', { defaultValue: 'Add Poll' })}
          action={() => onSelect('question')}
          data-testid="posts-composer-poll-type"
        >
          <ChartColumnBig className="size-5" />
        </Button>
      ) : null}
      {showEventType && isOwner ? (
        <Button
          compact
          variant="ghost"
          title={t('posts.switcher.event', { defaultValue: 'Create an Event' })}
          action={() => goto('/events/new')}
        >
          <CalendarDays className="size-5" />
        </Button>
      ) : null}
      {showArticleType ? (
        <Button
          compact
          variant="ghost"
          title={t('posts.switcher.article', { defaultValue: 'Write Article' })}
          action={() => goto('/articles/new')}
        >
          <ScrollText className="size-5" />
        </Button>
      ) : null}
    </div>
  );
}
