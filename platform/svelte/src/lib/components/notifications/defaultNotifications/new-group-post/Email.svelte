<script lang="ts">
  import type {
    EmailGlobals,
    PublicPost,
    GroupData,
    PublicProfile,
  } from '@openpeeps/common/types';
  import {
    Link,
    Section,
    Text,
    Heading,
    Button,
    Container,
    Img,
  } from '@openpeeps/svelte5-email';
  import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
  import { emailStyles } from '$lib/components/styles';
  import {
    getProfileAvatar,
    groupName,
    profileName,
    truncateText,
  } from '@openpeeps/common/lib';

  interface Props {
    globals: EmailGlobals;
    locals: {
      senderProfile: PublicProfile;
      post: PublicPost;
      recipientProfile: PublicProfile;
      group: GroupData;
      data: {
        replyPost: PublicPost;
      };
    };
  }

  let { globals, locals }: Props = $props();
  const { t } = globals.i18nContext;
</script>

<BaseEmailLayout
  {globals}
  previewText={t('emails.newGroupPost.title', {
    profileName: profileName(locals.senderProfile),
    groupName: groupName(locals.group),
    communityName: globals.communityConfig.info.name,
  })}
  showLogo={true}
  showGreeting={true}
  showAppLinks={true}
  showFooter={true}
>
  <Heading style={emailStyles.heading}>
    {t('emails.newGroupPost.title', {
      profileName: profileName(locals.senderProfile),
      groupName: groupName(locals.group),
      communityName: globals.communityConfig.info.name,
    })}
  </Heading>
  {#if locals.post?.data?.content}
    <Container style={emailStyles.infoContainer}>
      <Img
        src={getProfileAvatar(locals.senderProfile, globals.communityConfig)}
        alt={profileName(locals.senderProfile) || ''}
        style={emailStyles.avatar}
        width="50"
        height="50"
      />
      <Container style={emailStyles.messageCard}>
        <Container>
          <Text style={emailStyles.username}
            >{profileName(locals.senderProfile)}</Text
          >
          <Text style={emailStyles.handle}>@{locals.senderProfile.handle}</Text>
        </Container>
        <Text>
          {truncateText(locals.data.replyPost.data.content, 30)}
        </Text>
      </Container>
    </Container>
  {/if}
  <Section style={emailStyles.ctaContainer}>
    <Button
      href="{globals.serverData.rootUrl}/posts/{locals.post.id}"
      style={emailStyles.button}
    >
      {t('emails.newGroupPost.postCta')}
    </Button>
  </Section>
  <Link
    href="{globals.serverData.rootUrl}/groups/@{locals.group?.handle}"
    style={emailStyles.linkStyle}
  >
    {t('emails.newGroupPost.cta')}
  </Link>
</BaseEmailLayout>
