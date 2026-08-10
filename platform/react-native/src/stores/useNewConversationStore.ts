import {Profile} from '@openpeepshq/common';
import {create} from 'zustand';

interface NewConversationStore {
  members: Profile[];
  setMember: (member: Profile) => void;
  removeMember: (member: Profile) => void;
  clearMembers: () => void;
  contnt?: string;
  setContt: (contnt: string) => void;
  selectedMedia: string[];
  setSelectedMedia: (media: string[]) => void;
  conversationId?: string;
  setConversationId: (id: string) => void;
  conversationAudience?: Profile[];
  setConversationAudience: (audience: Profile[]) => void;
}

export const useNewConversationStore = create<NewConversationStore>(set => ({
  members: [],
  setMember: member => set(state => ({members: [...state.members, member]})),
  removeMember: member =>
    set(state => ({members: state.members.filter(m => m.id !== member.id)})),
  clearMembers: () => set({members: []}),
  contnt: undefined,
  setContt: contnt => set({contnt}),
  selectedMedia: [],
  setSelectedMedia(media) {
    set({selectedMedia: media});
  },
  conversationId: undefined,
  setConversationId: id => set({conversationId: id}),
  conversationAudience: [],
  setConversationAudience: audience => set({conversationAudience: audience}),
}));
