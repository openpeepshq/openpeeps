import { CirclePlay } from 'lucide-react';

export interface VideoPlayOverlayProps {
  video: boolean;
}

/** Mirrors Svelte `VideoPlayOverlay.svelte` — play affordance on video thumbnails. */
export const VideoPlayOverlay = ({ video }: VideoPlayOverlayProps) => {
  if (!video) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white">
        <CirclePlay className="size-8" />
      </div>
    </div>
  );
};
