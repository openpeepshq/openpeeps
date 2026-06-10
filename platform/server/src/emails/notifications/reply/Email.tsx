import { Button, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import { profileName } from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

interface Locals {
  senderProfile: PublicProfile;
  recipientProfile: PublicProfile;
  post: PublicPost;
  data: {
    replyPost: PublicPost;
  };
}

export const ReplyEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: Locals;
}) => {
  const { t } = globals.i18nContext;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t('emails.reply.body', {
        profileName: profileName(locals.senderProfile),
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>
        {t('emails.reply.body', {
          profileName: profileName(locals.senderProfile),
        })}
      </Text>
      {locals.data.replyPost ? (
        <EmailPostEmbed post={locals.data.replyPost} globals={globals} />
      ) : null}
      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/posts/${locals.data.replyPost.id}`}
          style={emailStyles.button}
        >
          {t('emails.reply.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
