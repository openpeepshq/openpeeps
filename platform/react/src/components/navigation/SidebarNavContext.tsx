import { createContext, useContext } from 'react';

/** When the sidebar is shown in the mobile drawer, call this after in-app navigation to close it. */
export const SidebarNavCloseContext = createContext<(() => void) | undefined>(
  undefined,
);

export const useSidebarNavClose = () => useContext(SidebarNavCloseContext);
