import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';
import type { EmailGlobals, PublicProfile } from '@openpeepshq/common/types';

import { emailMarkdownCss, emailStyles } from './styles';

export interface BaseEmailLayoutProps {
  globals: EmailGlobals;
  previewText?: string;
  showLogo?: boolean;
  showGreeting?: boolean;
  showAppLinks?: boolean;
  showFooter?: boolean;
  recipientProfile?: PublicProfile;
  headerContent?: ReactNode;
  mainContent?: ReactNode;
  footerContent?: ReactNode;
  children?: ReactNode;
}

export const BaseEmailLayout = ({
  globals,
  previewText,
  showLogo = true,
  showGreeting = false,
  showAppLinks = true,
  showFooter = true,
  recipientProfile,
  headerContent,
  mainContent,
  footerContent,
  children,
}: BaseEmailLayoutProps) => {
  const { t } = globals.i18nContext;
  const preview =
    previewText ?? `Notification from ${globals.communityConfig.info.name}`;

  return (
    <Html lang="en">
      <Head>
        <style>{emailMarkdownCss}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          {showLogo && (
            <Section style={emailStyles.logoContainer}>
              <Img
                src={globals.communityConfig.theme.light.logoSmall}
                width="100"
                style={{
                  maxWidth: '100px',
                  height: '75px',
                  display: 'block',
                  objectFit: 'contain',
                }}
                alt={globals.communityConfig.info.name}
              />
            </Section>
          )}

          {showGreeting && recipientProfile && (
            <Heading style={emailStyles.heading}>
              {t('emails.common.greeting', {
                profileName:
                  recipientProfile.displayName || recipientProfile.handle,
              })}
            </Heading>
          )}

          {headerContent}

          {mainContent ?? children}
        </Container>

        {showFooter && (
          <Container style={emailStyles.footer}>
            <Text style={emailStyles.footerText}>
              {t('emails.common.reasonForEmail')}{' '}
              <Link
                href={globals.serverData.rootUrl}
                style={emailStyles.linkStyle}
              >
                {globals.communityConfig.info.name}
              </Link>
            </Text>

            {showAppLinks &&
              globals.serverData.androidUrl &&
              globals.serverData.iosUrl && (
                <Section style={emailStyles.appStoreContainer}>
                  <div
                    style={{
                      marginBottom: '24px',
                      display: 'flex',
                      gap: '5px',
                      alignItems: 'center',
                    }}
                  >
                    <Link href={globals.serverData.iosUrl}>
                      <Img
                        src={`${globals.serverData.rootUrl}/img/appstore.png`}
                        width="125"
                        height="35"
                        alt="Download on the App Store"
                      />
                    </Link>
                    <Link href={globals.serverData.androidUrl}>
                      <Img
                        src={`${globals.serverData.rootUrl}/img/google-play.png`}
                        width="108"
                        height="35"
                        alt="Get it on Google Play"
                      />
                    </Link>
                  </div>
                </Section>
              )}

            {footerContent ?? (
              <Text style={emailStyles.footerText}>
                {t('emails.common.wantFewerEmails')}{' '}
                <Link
                  href={`${globals.serverData.rootUrl}/settings`}
                  style={emailStyles.linkStyle}
                >
                  {t('emails.common.manageNotications')}
                </Link>
              </Text>
            )}
          </Container>
        )}
      </Body>
    </Html>
  );
};
