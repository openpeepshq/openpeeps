<script lang="ts">
	import { LocalVideoTrack } from 'livekit-client';
	import type { JamSettings } from '@openpeeps/common/types';
	import { me, updateCurrentProfileMutation } from '$lib/api/profile';
	import { getJamContext, getLivekitRoom } from '../context';
	import { createVideoStream, switchBackground } from '../actions';
	import { jamSettingsStore } from '../stores';
	import { Blur, Button } from '@openpeeps/ui';
	import { profileDataSchema } from '@openpeeps/common/types';

	interface Props {
		type?: 'room' | 'lobby';
		localVideoTrack?: LocalVideoTrack | undefined;
	}

	let { type = 'room', localVideoTrack = $bindable(undefined) }: Props = $props();

	const isRoom = type === 'room';

	const room = getLivekitRoom();
	const { jam } = getJamContext();

	const updateCurrentProfile = updateCurrentProfileMutation();

	let blur = $derived($me?.settings?.jamSettings?.backgroundObfuscation?.type === 'blur');

	const handleLocalVideo = async (jamSettings: JamSettings) => {
		if ($jamSettingsStore.defaults.video) {
			const stream = await createVideoStream($jamSettingsStore.deviceIds.camera, jam, jamSettings);
			if (stream?.getVideoTracks().length) {
				localVideoTrack = new LocalVideoTrack(stream.getVideoTracks()[0]);
			}
		}
	};

	const toggleBlur = async () => {
		if ($me) {
			const jamSettings: JamSettings = {
				...($me?.settings?.jamSettings || {}),
				backgroundObfuscation: {
					type: blur ? 'none' : 'blur'
				}
			};
			const settings = {
				...($me?.settings || { feedSettings: {} }),
				jamSettings
			};
			await updateCurrentProfile({
				...profileDataSchema.parse($me),
				settings
			});
			if (isRoom) {
				await switchBackground(room, jam, jamSettings as JamSettings);
			} else {
				await handleLocalVideo(jamSettings);
			}
		}
	};
</script>

<Button
	title={`${blur ? 'Turn off blur' : 'Blur background'}`}
	variant={blur ? 'variant-soft-primary' : 'variant-soft-surface'}
	class="size-10 p-2"
	action={toggleBlur}
>
	<Blur />
</Button>
