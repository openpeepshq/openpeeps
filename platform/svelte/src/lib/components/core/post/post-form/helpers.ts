import { handleRegex, type MentionWithProfile, type PublicProfile } from '@openpeeps/common/types';

export const extractMentions = (
	content: string,
	profiles: PublicProfile[],
	additionalMentions: MentionWithProfile[] = []
) => {
	const mentionsAccountNames = content?.split(' ').filter((word) => {
		return word.startsWith('@') && handleRegex.test(word.substring(1));
	});

	const mentions = mentionsAccountNames
		?.map((mention) => {
			const profile = profiles.find((profile) => {
				return profile.handle === mention.substring(1);
			});
			if (profile) {
				return {
					profile,
					text: mention
				};
			}
		})
		.filter(Boolean);

	return (
		(mentions?.filter(
			(m) =>
				m &&
				!additionalMentions.find(
					(existingMention) => existingMention.profile.handle === m?.profile?.handle
				)
		) as MentionWithProfile[]) ?? []
	);
};
