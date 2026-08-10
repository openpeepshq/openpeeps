import { Button, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

interface Locals {
  senderProfile: PublicProfile;
  recipientProfile: PublicProfile;
  post: PublicPost;
}

export const ReactionEmail = ({
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
      previewText={t('emails.reaction.body', {
        profileName: profileName(locals.senderProfile),
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>
        {t('emails.reaction.body', {
          profileName: profileName(locals.senderProfile),
        })}
      </Text>
      <Section>
        {locals.post ? <EmailPostEmbed post={locals.post} globals={globals} /> : null}

        <Section style={emailStyles.ctaContainer}>
          <Button
            href={`${globals.serverData.rootUrl}/posts/${locals.post.id}`}
            style={emailStyles.button}
          >
            {t('emails.reaction.cta')}
          </Button>
        </Section>
      </Section>
    </BaseEmailLayout>
  );
};
