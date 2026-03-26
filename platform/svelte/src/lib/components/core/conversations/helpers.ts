import type { PublicProfile, PublicPost } from '@openpeeps/common/types';

export const inAudience = (post: PublicPost, profile: PublicProfile) =>
	post.audience?.map((p) => p.id).includes(profile.id);

export const audienceDiff = (firstPost: PublicPost | undefined, secondPost: PublicPost) => {
	const firstPostParticipants = (firstPost?.audience || []);
	const secondPostParticipants = (secondPost?.audience || []);

	const added = secondPostParticipants.filter(
		(p) => !firstPostParticipants.map((pp) => pp.id).includes(p.id)
	);
	const removed = firstPostParticipants.filter(
		(p) => !secondPostParticipants.map((pp) => pp.id).includes(p.id)
	);

	return { added, removed };
};
