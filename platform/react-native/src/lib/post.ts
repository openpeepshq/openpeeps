import { PollChoiceForm } from '../types';
import Toast from 'react-native-toast-message';
import {
  dateSorter,
  MediaAttachmentData,
  PostCreationData,
  PublicPost,
  Thread,
} from '@openpeepshq/common';
import { uploadMedia } from './uploadMedia';

/** True if the attachment is still being processed server-side. */
export const isAttachmentProcessing = (
  attachment: MediaAttachmentData,
): boolean => attachment.status === 'processing';

/** True if at least one of `postData.data.attachments` is still processing. */
export const hasProcessingAttachments = (
  postData: PostCreationData | undefined,
): boolean =>
  (postData?.data?.attachments ?? []).some(isAttachmentProcessing);

export const handleMediaUpload = async (
  selectedMedia: { uri: string; type: 'video' | 'image'; alt?: string }[],
  createAttachments: any,
  serverConfig: string,
) => {
  const attachments = await Promise.all(
    selectedMedia.map(media =>
      uploadMedia({
        mediaUri: media.uri,
        createAttachments: createAttachments,
        type: media.type,
        usage: `${serverConfig}:${media.type}`,
        alt: media?.alt,
      }),
    ),
  );

  return attachments.filter(
    (attachment): attachment is NonNullable<typeof attachment> =>
      attachment !== null,
  );
};

export const validatePollData = (formData: PollChoiceForm): boolean => {
  if (formData.choices.some(choice => !choice.text.trim())) {
    Toast.show({
      type: 'error',
      text1: 'Please fill in all poll choices',
    });
    return false;
  }

  if (!formData.pollLength.trim()) {
    Toast.show({
      type: 'error',
      text1: 'Please set a poll length',
    });
    return false;
  }
  return true;
};

export const noteToQuestion = (
  postData: PostCreationData,
): PostCreationData => ({
  ...postData,
  type: 'question',
  data: {
    ...postData.data,
    type: 'question',
    options: [
      {
        type: 'note',
        content: '',
      },
      {
        type: 'note',
        content: '',
      },
    ],
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
});
export const toQuestion = (
  postData: PostCreationData,
): PostCreationData => ({
  ...postData,
  type: 'question',
  data: {
    ...postData.data,
    type: 'question',
    options: [
      {
        type: 'note',
        content: '',
      },
      {
        type: 'note',
        content: '',
      },
    ],
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
});

export const toArticle = (
  postData: PostCreationData,
): PostCreationData => ({
  ...postData,
  type: 'article',
  data: {
    content: postData.data.content,
    type: 'article',
    attachments: postData.data.attachments,
  },
});


export const toNote = (
  postData: PostCreationData,
): PostCreationData => ({
  ...postData,
  type: 'note',
  data: {
    content: postData.data.content,
    type: 'note',
    attachments: postData.data.attachments,
  },
});

export const questionToNote = (
  postData: PostCreationData,
): PostCreationData => ({
  ...postData,
  type: 'note',
  data: {
    content: postData.data.content,
    type: 'note',
    attachments: postData.data.attachments,
  },
});

// export const handleScroll = (
//   event: any,
//   setCurrentIndex: (index: number) => void,
// ) => {
//   const slideSize = event.nativeEvent.layoutMeasurement.width;
//   const offset = event.nativeEvent.contentOffset.x;
//   const currentIndex = Math.round(offset / slideSize);
//   setCurrentIndex(currentIndex);
// };

export const lastLongestPathSelector = (
  thread: Thread,
): Thread & { depth: number } => {
  const candidates = thread.children.map((t) => lastLongestPathSelector(t));

  const maxDepth = Math.max(0, ...candidates.map((c) => c.depth));

  const selectedChild = candidates
    .filter((c) => c.depth === maxDepth)
    .sort(dateSorter())
    .reverse()[0];

  return {
    ...thread,
    children: selectedChild ? [selectedChild] : [],
    depth: maxDepth + 1,
  };
};

export const collectPath = (
  thread: Thread,
  currentPath: PublicPost[] = [],
): PublicPost[] => {
  if (thread) {
    return [...currentPath, thread, ...collectPath(thread.children[0])];
  } else {
    return currentPath;
  }
};
