<script lang="ts">
  import {
    Html,
    Preview,
    Body,
    Container,
    Section,
    Text,
    Link,
    Img,
    Heading,
  } from '@openpeeps/svelte5-email';
  import type { EmailGlobals, PublicProfile } from '@openpeeps/common/types';
  import { emailStyles } from '../../components/styles/index';

  interface Props {
    globals: EmailGlobals;
    previewText?: string;
    showLogo?: boolean;
    showGreeting?: boolean;
    showAppLinks?: boolean;
    showFooter?: boolean;
    recipientProfile?: PublicProfile;
    headerContent?: import('svelte').Snippet;
    mainContent?: import('svelte').Snippet;
    footerContent?: import('svelte').Snippet;
    children?: import('svelte').Snippet;
  }

  let {
    globals,
    previewText = `Notification from ${globals.communityConfig.info.name}`,
    showLogo = true,
    showGreeting = false,
    showAppLinks = true,
    showFooter = true,
    recipientProfile,
    headerContent,
    mainContent,
    footerContent,
    children,
  }: Props = $props();

  const { t } = globals.i18nContext;
</script>

<Html lang="en">
  <Preview preview={previewText} />
  <Body style={emailStyles.main}>
    <Container style={emailStyles.container}>
      {#if showLogo}
        <Section style={emailStyles.logoContainer}>
          <Img
            src={`${globals.communityConfig.theme.light.logoSmall}`}
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
      {/if}

      {#if showGreeting && recipientProfile}
        <Heading style={emailStyles.heading}>
          {t('emails.common.greeting', {
            profileName:
              recipientProfile.displayName || recipientProfile.handle,
          })}
        </Heading>
      {/if}

      {#if headerContent}
        {@render headerContent()}
      {/if}

      {#if mainContent}
        {@render mainContent()}
      {:else if children}
        {@render children()}
      {/if}
    </Container>

    {#if showFooter}
      <Container style={emailStyles.footer}>
        <Text style={emailStyles.footerText}>
          {t('emails.common.reasonForEmail')}
          <Link href={globals.serverData.rootUrl} style={emailStyles.linkStyle}>
            {globals.communityConfig.info.name}
          </Link>
        </Text>
        {#if showAppLinks && globals.serverData.androidUrl && globals.serverData.iosUrl}
          <Section style={emailStyles.appStoreContainer}>
            <div
              style="margin-bottom: 24px; display:flex; gap: 5px; align-items:center"
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
        {/if}

        {#if footerContent}
          {@render footerContent()}
        {:else}
          <Text style={emailStyles.footerText}>
            {t('emails.common.wantFewerEmails')}
            <Link
              href="{globals.serverData.rootUrl}/settings"
              style={emailStyles.linkStyle}
            >
              {t('emails.common.manageNotications')}
            </Link>
          </Text>
        {/if}
      </Container>
    {/if}
  </Body>
</Html>
