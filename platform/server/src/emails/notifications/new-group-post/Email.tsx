import { Button, Heading, Link, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';
import { groupName, profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

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
  const titleKey = isRepost
    ? 'emails.newGroupPost.repostTitle'
    : 'emails.newGroupPost.title';
  const subjectKey = isRepost
    ? 'emails.newGroupPost.repostSubject'
    : 'emails.newGroupPost.subject';

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
