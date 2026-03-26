<script lang="ts">
  import AnimatedEmoji from './AnimatedEmoji.svelte';
  import { RoomEvent } from 'livekit-client';
  import { getLivekitRoom } from '../context';
  import { type JamEvent, jamEventSchema } from '@openpeeps/common/types';

  interface Props {
    participantId: string;
  }

  let { participantId }: Props = $props();

  const room = getLivekitRoom();
  const decoder = new TextDecoder();

  let participantReactions: JamEvent[] = $state([]);

  room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
    const receivedPacket = decoder.decode(payload);
    const jamEvent: JamEvent = jamEventSchema.parse(
      JSON.parse(receivedPacket),
    ) as JamEvent;

    if (jamEvent.type === 'reaction' && jamEvent.profileId === participantId) {
      participantReactions = [...participantReactions, jamEvent];
      setTimeout(() => {
        participantReactions = participantReactions.filter(
          (r) => r.id !== jamEvent.id,
        );
      }, 5000);
    }
  });
</script>

{#each participantReactions as reaction (reaction.id)}
  <AnimatedEmoji emoji={reaction.content ?? ''} />
{/each}
