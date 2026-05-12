import type { ReactNode } from 'react';
import {
  Breadcrumbs,
  ContentHeader,
  FooterMobile,
  HeaderMobile,
  PlusButton,
  SideBar,
} from '../navigation';
import { Infos } from './Infos';

export interface RootLayoutProps {
  children?: ReactNode;
  /** Signed-in sidebar slots (desktop rail + mobile drawer). */
  sideBar?: {
    mainMenu?: () => ReactNode;
    profileMenu?: () => ReactNode;
  };
}

/**
 * Translation of @openpeeps/svelte/components/layout/Root.svelte. Provides the
 * top-level layout shell: on desktop, sidebar and main column sit in a row
 * inside the centered max-width band (`md:flex-row`); mobile header / footer,
 * plus button, and breadcrumbs / content header wrap `children`.
 */
export function RootLayout({ children, sideBar }: RootLayoutProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-grow">
        <div className="flex min-h-full w-full flex-col overflow-y-auto">
          <div className="mx-auto h-1 w-full flex-grow md:max-w-[950px]">
            <div className="flex w-full flex-col md:flex-row">
              <aside className="bg-card hidden w-70 shrink-0 border-r md:sticky md:top-0 md:flex md:h-screen md:self-start">
                <SideBar
                  mainMenu={sideBar?.mainMenu?.()}
                  profileMenu={sideBar?.profileMenu?.()}
                />
              </aside>
              <div className="bg-card flex min-h-screen min-w-0 flex-1 flex-col border-r">
                <HeaderMobile sideBar={sideBar} />
                <ContentHeader />
                <Breadcrumbs />
                <Infos />
                {children}
                <PlusButton />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bottom-0 w-full flex-grow-0 md:hidden">
        <FooterMobile />
      </div>
    </div>
  );
}
