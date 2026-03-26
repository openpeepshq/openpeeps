import { registerComponent } from '$lib/components/registry';
import Announcement from './Announcement.svelte';
import DirectMessage from './DirectMessage.svelte';
import Follow from './Follow.svelte';
import JamModerator from './JamModerator.svelte';
import JamSpeaker from './JamSpeaker.svelte';
import JamStarted from './JamStarted.svelte';
import NewProfile from './NewProfile.svelte';
import Reaction from './Reaction.svelte';
import Reply from './Reply.svelte';
import Repost from './Repost.svelte';
import NewGroupInvitation from './NewGroupInvitation.svelte';
import NewGroupMember from './NewGroupMember.svelte';
import GroupMemberExit from './GroupMemberExit.svelte';
import PollVote from './PollVote.svelte';
import Rsvp from './Rsvp.svelte';
import NewGroupPost from './NewGroupPost.svelte';

export const registerNotificationComponents = () => {
    registerComponent('notification-announcement', Announcement);
    registerComponent('notification-reaction', Reaction);
    registerComponent('notification-reply', Reply);
    registerComponent('notification-repost', Repost);
    registerComponent('notification-directMessage', DirectMessage);
    registerComponent('notification-follow', Follow);
    registerComponent('notification-groupAdded', NewGroupInvitation);
    registerComponent('notification-groupMemberJoined', NewGroupMember);
    registerComponent('notification-groupMemberLeft', GroupMemberExit);
    registerComponent('notification-jamSpeaker', JamSpeaker);
    registerComponent('notification-jamModerator', JamModerator);
    registerComponent('notification-jamStarted', JamStarted);
    registerComponent('notification-newProfile', NewProfile);
    registerComponent('notification-newMember', NewProfile);
    registerComponent('notification-pollVote', PollVote);
    registerComponent('notification-newGroupPost', NewGroupPost);
    registerComponent('notification-rsvp', Rsvp);
}