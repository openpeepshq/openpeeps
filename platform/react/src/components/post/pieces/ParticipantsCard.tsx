import type { JamState } from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { Avatar } from '../../profile';

export interface ParticipantsCardProps {
  jamState: JamState;
  size?: number;
}

function ParticipantAvatar({ id, size }: { id: string; size: number }) {
  const { openpeepsApi } = useOpenpeeps();
  const profile = openpeepsApi.useProfile(id).data;
  return (
    <Avatar
      profile={profile}
      size={size}
      borderless
      containerClassName="-mr-2"
    />
  );
}

/** Overlapping avatar stack of the first jam participants. Mirrors the Svelte
 * `ParticipantsCard`. */
export function ParticipantsCard({ jamState, size = 1.5 }: ParticipantsCardProps) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex items-center">
        {jamState.participants.slice(0, 2).map((id) => (
          <ParticipantAvatar key={id} id={id} size={size} />
        ))}
      </div>
    </div>
  );
}
