import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { SignUpLoginModal } from './SignUpLoginModal';

interface SignUpLoginModalContextValue {
  /** Open the guest sign-up / login prompt. */
  openSignUpLogin: () => void;
}

const SignUpLoginModalContext =
  createContext<SignUpLoginModalContextValue | null>(null);

export function SignUpLoginModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openSignUpLogin = useCallback(() => setOpen(true), []);

  return (
    <SignUpLoginModalContext.Provider value={{ openSignUpLogin }}>
      {children}
      {open ? <SignUpLoginModal onClose={() => setOpen(false)} /> : null}
    </SignUpLoginModalContext.Provider>
  );
}

export function useSignUpLoginModal() {
  const ctx = useContext(SignUpLoginModalContext);
  if (!ctx) {
    throw new Error(
      'useSignUpLoginModal must be used within SignUpLoginModalProvider',
    );
  }
  return ctx;
}
