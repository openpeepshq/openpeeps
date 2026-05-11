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
}

/**
 * Translation of @openpeeps/svelte/components/layout/Root.svelte. Provides the
 * top-level layout shell — sidebar on desktop, mobile header / footer, plus
 * button, and breadcrumbs / content header surrounding `children`.
 */
export function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-grow">
        <div className="flex min-h-full w-full flex-col overflow-y-auto">
          <div className="mx-auto h-1 w-full flex-grow md:max-w-[950px]">
            <div className="w-70 bg-card fixed hidden h-screen border-r md:flex">
              <SideBar />
            </div>
            <div className="bg-card md:ml-70 flex h-fit min-h-screen flex-col border-r">
              <HeaderMobile />
              <ContentHeader />
              <Breadcrumbs />
              <Infos />
              {children}
              <PlusButton />
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
