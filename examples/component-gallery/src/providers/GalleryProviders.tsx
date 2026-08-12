import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import i18next, { type i18n as I18nInstance } from 'i18next';
import { i18nextResources } from '@openpeepshq/i18n';
import { OpenpeepsProvider } from '@openpeepshq/react/contexts';
import { I18nProvider } from '@openpeepshq/react/i18n';
import { IdentityContext } from '@openpeepshq/react/components/layout';
import { CreateNewConversationProvider } from '@openpeepshq/react/components/conversations';
import { StaticRenderContext } from '@openpeepshq/react/components/markdown';
import { ServerDataContext } from '@openpeepshq/react/components/server-data';
import {
  fixtureCapabilities,
  fixtureMe,
  fixtureServerInfo,
} from '@/fixtures/domain';
import {
  GalleryThemeProvider,
  galleryProfileSettings,
  useGalleryTheme,
} from '@/providers/GalleryThemeProvider';

// No backend: the store never yields a token, so the client stays idle and
// components fall back to their fixture props.
const galleryCredentialsStore = {
  get: async () => null,
  set: async () => undefined,
  clear: async () => undefined,
};

const galleryBaseUrl =
  typeof window === 'undefined' ? 'http://localhost' : window.location.origin;

const initGalleryI18n = async (): Promise<I18nInstance> => {
  const instance = i18next.createInstance();
  await instance.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: { translation: i18nextResources.en },
      de: { translation: i18nextResources.de },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
};

type Props = {
  children: ReactNode;
};

const GalleryIdentity = ({ children }: Props): ReactElement => {
  const { mode } = useGalleryTheme();
  return (
    <IdentityContext.Provider
      value={{
        profile: fixtureMe,
        profileSettings: galleryProfileSettings(mode),
      }}
    >
      {children}
    </IdentityContext.Provider>
  );
};

export const GalleryProviders = ({ children }: Props): ReactElement | null => {
  const [i18n, setI18n] = useState<I18nInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    void initGalleryI18n().then((instance) => {
      if (!cancelled) setI18n(instance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!i18n) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Loading gallery…
      </div>
    );
  }

  return (
    <GalleryThemeProvider>
      <I18nProvider instance={i18n}>
        <OpenpeepsProvider
          credentialsStore={galleryCredentialsStore}
          baseUrl={galleryBaseUrl}
        >
          <ServerDataContext.Provider
            value={{
              serverInfo: fixtureServerInfo,
              capabilities: fixtureCapabilities,
            }}
          >
            <GalleryIdentity>
              <CreateNewConversationProvider>
                <StaticRenderContext.Provider value={{ enabled: true }}>
                  {children}
                </StaticRenderContext.Provider>
              </CreateNewConversationProvider>
            </GalleryIdentity>
          </ServerDataContext.Provider>
        </OpenpeepsProvider>
      </I18nProvider>
    </GalleryThemeProvider>
  );
};
