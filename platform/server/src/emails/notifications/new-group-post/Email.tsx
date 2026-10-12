import { Button, Heading, Link, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';
import { groupName, profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

export const newGroupPostCopyKeys = (post: ExpandedNotification['post']) => {
  if (post?.repost) {
    return {
      title: 'emails.newGroupPost.repostTitle',
      subject: 'emails.newGroupPost.repostSubject',
    };
  }
  if (post?.type === 'event') {
    return {
      title: 'emails.newGroupPost.eventTitle',
      subject: 'emails.newGroupPost.eventSubject',
    };
  }
  return {
    title: 'emails.newGroupPost.title',
    subject: 'emails.newGroupPost.subject',
  };
};

export const NewGroupPostEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: ExpandedNotification;
}) => {
  const { t } = globals.i18nContext;

  const post = locals.post;
  const original = post?.repost ?? undefined;
  const isRepost = !!original;
  const previewPost = original ?? post;
  const { title: titleKey, subject: subjectKey } = newGroupPostCopyKeys(post);

  const profileNameValue = profileName(locals.senderProfile ?? undefined);
  const groupNameValue = groupName(locals.group ?? undefined);
  const communityName = globals.communityConfig.info.name;
  const copyVars = {
    profileName: profileNameValue,
    groupName: groupNameValue,
    communityName,
  };

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t(subjectKey, copyVars)}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Heading style={emailStyles.heading}>{t(titleKey, copyVars)}</Heading>
      {isRepost && original.profile ? (
        <Text style={{ ...emailStyles.username, margin: '0 0 8px 0' }}>
          {t('emails.newGroupPost.originalAuthor', {
            profileName: profileName(original.profile),
          })}
        </Text>
      ) : null}
      {previewPost ? (
        <EmailPostEmbed post={previewPost} globals={globals} />
      ) : null}
      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/posts/${post?.id}`}
          style={emailStyles.button}
        >
          {t('emails.newGroupPost.postCta')}
        </Button>
      </Section>
      <Link
        href={`${globals.serverData.rootUrl}/groups/@${locals.group?.handle}`}
        style={emailStyles.linkStyle}
      >
        {t('emails.newGroupPost.cta')}
      </Link>
    </BaseEmailLayout>
  );
};
