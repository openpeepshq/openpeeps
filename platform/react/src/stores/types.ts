import type { ReactNode } from 'react';
import type { IconType } from '@openpeeps/react-ui';
import type { PostCreationData } from '@openpeeps/common';

export interface Crumb {
  text: string;
  link?: string;
}

export interface PageHeader {
  title?: string | ReactNode;
  actions?: ReactNode;
}

export interface PlusButtonAction {
  action: string | (() => Promise<unknown> | unknown);
  icon?: IconType;
  title?: string;
}

export type PlusButtonActions =
  | PlusButtonAction
  | PlusButtonAction[]
  | undefined;

export interface NewPostsState {
  jam: PostCreationData;
  resetNewJamState: () => void;
  event: PostCreationData;
  resetNewEventState: () => void;
  article: PostCreationData;
  resetNewArticleState: () => void;
  note: PostCreationData;
  resetNewNoteState: () => void;
  question: PostCreationData;
  resetNewQuestionState: () => void;
}
