import { Event, Jam, JamEvent, PublicPost } from '@openpeeps/common';
import { create } from 'zustand';

interface JamSettingsStore {
  defaults: {
    audio: boolean;
    video: boolean;
    screenshare: boolean;
  };
  setDefaults: (audio: boolean, video: boolean, screenshare: boolean) => void;
  deviceIds: {
    microphone: string;
    camera: string;
    screenshare: string;
  };
  setDeviceIds: (deviceIds: {
    microphone: string;
    camera: string;
    screenshare: string;
  }) => void;
}

export const useJamSettingsStore = create<JamSettingsStore>(set => ({
  defaults: {
    audio: false,
    video: false,
    screenshare: false,
  },
  setDefaults: (audio, video, screenshare) =>
    set({ defaults: { audio, video, screenshare } }),
  deviceIds: {
    microphone: '',
    camera: '',
    screenshare: '',
  },
  setDeviceIds: deviceIds => set({ deviceIds }),
}));

interface JamStore {
  jamPost?: PublicPost;
  jamEvent?: Event;
  jam?: Jam;
  setJamPost: (jamPost?: PublicPost) => void;
  clearJamStore: () => void
}

export const useJamStore = create<JamStore>(set => ({
  jamPost: undefined,
  setJamPost: jamPost => {
    const jamEvent = jamPost?.data as Event;
    const jam = jamEvent?.jam;
    set({ jamPost, jamEvent, jam });
  },
  clearJamStore: () => {
    set({ jamPost: undefined, jamEvent: undefined, jam: undefined });
  },
}));

interface OwnReactionsStore {
  ownReactions: JamEvent[];
  setOwnReactions: (reactions: JamEvent[]) => void;
  addOwnReaction: (reaction: JamEvent) => void;
}

export const useOwnReactionsStore = create<OwnReactionsStore>(set => ({
  ownReactions: [],
  setOwnReactions: reactions => set({ ownReactions: reactions }),
  addOwnReaction: reaction => {
    set(state => ({
      ownReactions: [...state.ownReactions, reaction],
    }));

    // Automatically remove the reaction after 5 seconds
    setTimeout(() => {
      set(state => ({
        ownReactions: state.ownReactions.filter(r => r.id !== reaction.id),
      }));
    }, 5000);
  },
}));

interface JamLivekitStore {
  token?: string;
  livekitUrl?: string;
  connected: boolean;

  connect: (token: string, livekitUrl: string) => void;
  disconnect: () => void;
}

export const useJamLivekitStore = create<JamLivekitStore>(set => ({
  token: undefined,
  livekitUrl: undefined,
  connected: false,
  connect: (token, livekitUrl) => set({ token, livekitUrl, connected: true }),
  disconnect: () => set({ token: undefined, livekitUrl: undefined, connected: false }),
}));
