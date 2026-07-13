import { PROFILE_GROUP_HEADER_ASPECT_RATIO } from '@openpeeps/common/lib';
import { useT } from '../../i18n';
import { ImageInput } from './ImageInput';

export interface HeaderAvatarInputProps {
  header?: string;
  avatar?: string;
  onHeaderChange: (url: string) => void;
  onAvatarChange: (url: string) => void;
}

/**
 * Translation of `form/HeaderAvatarInput.svelte`: a full-width cover banner
 * (forced 3:1 crop) with the round avatar picker overhanging its lower-left
 * corner. Both reuse the shared `ImageInput` so the upload/crop flow matches
 * the Svelte UI.
 */
export function HeaderAvatarInput({
  header,
  avatar,
  onHeaderChange,
  onAvatarChange,
}: HeaderAvatarInputProps) {
  const t = useT();
  return (
    <div className="relative mb-16 w-full">
      <ImageInput
        usage="header-image"
        url={header}
        onChange={(url) => onHeaderChange(url ?? '')}
        aspectRatio={PROFILE_GROUP_HEADER_ASPECT_RATIO}
        showAltInput={false}
        text={t('form.headerAvatarInput.coverImage', {
          defaultValue: 'Cover image',
        })}
        specsText={t('form.headerAvatarInput.coverImageDescription')}
      />
      <div className="absolute -bottom-12 left-4">
        <ImageInput
          usage="avatar-image"
          displayType="avatar"
          url={avatar}
          onChange={(url) => onAvatarChange(url ?? '')}
          showAltInput={false}
        />
      </div>
    </div>
  );
}
