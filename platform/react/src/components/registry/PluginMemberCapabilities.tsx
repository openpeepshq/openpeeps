import type {
  PluginMemberCapabilities as PluginMemberCapabilitiesType,
  PluginMemberResourceKind,
  PluginSettingsPatch,
  PostCreationData,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common';
import type { OpenpeepsClient } from '@openpeepshq/client';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';

import type { NavTarget } from '../../navigation';
import { MessageInThread } from '../conversations/MessageInThread';

export type PluginMemberCapabilities =
  PluginMemberCapabilitiesType<ReactElement>;

type RequestResult<T> = Promise<{ data: T } | { error: unknown }>;
type RequestOptions = {
  onResponseStatus: (status: number) => void;
};

type HostRequestError = Error & { status?: number };

const hostRequestError = (status?: number): HostRequestError => {
  const error = new Error('Host request failed') as HostRequestError;
  error.status = status;
  return error;
};

const call = async <T,>(
  request: (options: RequestOptions) => RequestResult<T>,
): Promise<T> => {
  let status: number | undefined;
  const result = await request({
    onResponseStatus: (responseStatus) => {
      status = responseStatus;
    },
  });
  if ('data' in result) return result.data;
  throw hostRequestError(status);
};

export const createPluginMemberCapabilities = (
  client: OpenpeepsClient,
  navigate: (target: NavTarget) => void,
  queryClient: QueryClient,
): PluginMemberCapabilities => {
  const readProfile = (id: string) =>
    call<PublicProfile>((options) =>
      client.profiles.findById({
        pathParameters: { id },
        ...options,
      }),
    );

  const readGroup = (id: string) =>
    call<{ handle: string }>((options) =>
      client.groups.findById({
        pathParameters: { id },
        ...options,
      }),
    );

  const readCurrentProfile = () =>
    call<PublicProfile>((options) => client.profiles.current.read(options));

  const listConversations = () =>
    call<readonly (readonly PublicPost[])[]>((options) =>
      client.conversations.list(options),
    );

  const readConversation = (rootId: string) =>
    call<readonly PublicPost[]>((options) =>
      client.conversations.findById({
        pathParameters: { id: rootId },
        ...options,
      }),
    );

  const createConversation = (payload: PostCreationData) =>
    call<PublicPost>((options) => client.posts.create(payload, options));

  const replyToConversation = (rootId: string, payload: PostCreationData) =>
    call<PublicPost>((options) =>
      client.conversations.newPost(payload, {
        pathParameters: { id: rootId },
        ...options,
      }),
    );

  const onConversationChanged = (listener: () => void) =>
    queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === 'conversations') listener();
    });

  const readSettings = (namespace: string, name: string) =>
    call((options) =>
      client.profiles.current.readPluginSettings({
        pathParameters: { namespace, name },
        ...options,
      }),
    );

  const compareAndSetSettings = (
    namespace: string,
    name: string,
    patch: PluginSettingsPatch,
  ) =>
    call((options) =>
      client.profiles.current.updatePluginSettings(patch, {
        pathParameters: { namespace, name },
        ...options,
      }),
    );

  const openResource = async (kind: PluginMemberResourceKind, id: string) => {
    switch (kind) {
      case 'profile': {
        const profile = await readProfile(id);
        navigate({ type: 'profile', handle: profile.handle });
        return;
      }
      case 'group': {
        const group = await readGroup(id);
        navigate({ type: 'group', handle: group.handle });
        return;
      }
      case 'jam':
        navigate({ type: 'jam', id });
        return;
      case 'post':
        navigate({ type: 'post', id });
        return;
    }
  };

  return {
    profiles: {
      read: readProfile,
      readCurrent: readCurrentProfile,
    },
    conversations: {
      list: listConversations,
      read: readConversation,
      create: createConversation,
      reply: replyToConversation,
      onChanged: onConversationChanged,
    },
    settings: {
      read: readSettings,
      compareAndSet: compareAndSetSettings,
    },
    renderMessage: ({
      message,
      previous,
      conversationRootId,
      multipleParticipants,
    }) => (
      <MessageInThread
        message={message}
        previous={previous}
        conversationRootId={conversationRootId}
        multipleParticipants={multipleParticipants}
      />
    ),
    openResource,
  };
};
