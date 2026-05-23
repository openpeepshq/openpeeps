import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { CreateNewJamModal } from './CreateNewJam';

interface CreateNewJamContextValue {
  openCreateJam: () => void;
}

const CreateNewJamContext = createContext<CreateNewJamContextValue | null>(null);

export function CreateNewJamProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openCreateJam = useCallback(() => setOpen(true), []);

  return (
    <CreateNewJamContext.Provider value={{ openCreateJam }}>
      {children}
      {open ? <CreateNewJamModal onClose={() => setOpen(false)} /> : null}
    </CreateNewJamContext.Provider>
  );
}

export function useCreateNewJam() {
  const ctx = useContext(CreateNewJamContext);
  if (!ctx) {
    throw new Error('useCreateNewJam must be used within CreateNewJamProvider');
  }
  return ctx;
}
