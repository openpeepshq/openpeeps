import {create} from 'zustand';

interface AppImagesStore {
  background: string | null;
  setBackground: (background: string | null) => void;
  logoSmall: string | null;
  setLogoSmall: (logoSmall: string | null) => void;
}

export const useAppImagesStore = create<AppImagesStore>(set => ({
  background: null,
  setBackground: background => set({background}),
  logoSmall: null,
  setLogoSmall: logoSmall => set({logoSmall}),
}));
