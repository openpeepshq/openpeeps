import { useEffect, useState } from 'react';
import {
  conversationLabel,
  messagePreviewText,
  profileName,
  type DirectMessageSearchHit,
} from '@openpeepshq/common';
import { Input, UpdatingDate } from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';

export const DirectMessageSearch = ({
  conversationId,
  autoFocus,
  onQueryChange,
  onSelect,
}: {
  conversationId?: string;
  autoFocus?: boolean;
  onQueryChange?: (query: string) => void;
  onSelect: (hit: DirectMessageSearchHit) => void;
}) => {
  const t = useT();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(handle);
  }, [input]);

  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  const search = openpeepsApi.useSearchDirectMessages(query, conversationId);
  const active = query.length >= 2;
  const hits = search.data ?? [];
  const placeholder = conversationId
    ? t('conversations.search.inConversation', {
        defaultValue: 'Search this conversation…',
      })
    : t('conversations.search.placeholder', {
        defaultValue: 'Search all messages…',
      });

  return (
    <form
      role="search"
      className="border-border space-y-2 border-b p-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <Input
        type="search"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        data-testid="dm-search-input"
      />
      {active && search.isFetching ? (
        <p className="text-muted-foreground text-sm">
          {t('conversations.search.searching', { defaultValue: 'Searching…' })}
        </p>
      ) : null}
      {active && search.isError ? (
        <p className="text-destructive text-sm">
          {t('conversations.search.error', { defaultValue: 'Search failed' })}
        </p>
      ) : null}
      {active && !search.isFetching && !search.isError && hits.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('conversations.search.empty', {
            defaultValue: 'No messages match "{{query}}"',
            query,
          })}
        </p>
      ) : null}
      {active && hits.length > 0 ? (
        <ul
          aria-label={t('conversations.search.results', {
            defaultValue: 'Message search results',
          })}
          className="max-h-64 overflow-y-auto"
          data-testid="dm-search-results"
        >
          {hits.map((hit) => {
            const senderId = hit.message.profile.id;
            const sender =
              senderId === me?.id
                ? t('common.you', { defaultValue: 'You' })
                : profileName(hit.message.profile);
            const others = conversationLabel(hit.message, me?.id);
            return (
              <li key={hit.message.id}>
                <button
                  type="button"
                  className="hover:bg-surface w-full rounded-md px-2 py-2 text-left"
                  title={t('conversations.search.openResult', {
                    defaultValue: 'Show this message',
                  })}
                  data-testid="dm-search-result"
                  onClick={() => onSelect(hit)}
                >
                  {!conversationId && others ? (
                    <span className="block truncate text-sm font-semibold">
                      {others}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground block truncate text-sm">
                    {sender}
                    {' · '}
                    <UpdatingDate date={hit.message.createdAt} />
                  </span>
                  <span className="line-clamp-2 text-sm">
                    {messagePreviewText(hit.message)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </form>
  );
};
