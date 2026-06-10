import { useState } from 'react';
import type { PublicProfile, VisibilityType } from '@openpeeps/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { ProfileCard } from '../../profile';

export interface AudiencePickerProps {
  visibility: VisibilityType;
  audience: PublicProfile[];
  onChange: (audience: PublicProfile[]) => void;
}

export function AudiencePicker({
  visibility,
  audience,
  onChange,
}: AudiencePickerProps) {
  const t = useT();
  const me = useCurrentProfile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { openpeepsApi } = useOpenpeeps();
  const profilesQuery = openpeepsApi.useSearchProfiles(query);

  if (visibility !== 'direct') return null;

  const profiles = (profilesQuery.data?.pages ?? [])
    .flat()
    .map((item) => item.data)
    .filter((p) => p.id !== me?.id)
    .slice(0, 8);

  const toggle = (profile: PublicProfile) => {
    if (audience.some((a) => a.id === profile.id)) {
      onChange(audience.filter((a) => a.id !== profile.id));
    } else {
      onChange([...audience, profile]);
    }
  };

  return (
    <>
      <Button
        variant="variant-ghost-primary"
        action={() => setOpen(true)}
      >
        {audience.length
          ? t('posts.form.audienceCount', {
              defaultValue: '{{count}} recipients',
              count: audience.length,
            })
          : t('posts.form.chooseAudience', { defaultValue: 'Choose audience' })}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('posts.form.directAudience', {
                defaultValue: 'Direct message audience',
              })}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('posts.form.mentionSearch', {
              defaultValue: 'Search members…',
            })}
          />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {profiles.map((profile) => {
              const selected = audience.some((a) => a.id === profile.id);
              return (
                <button
                  key={profile.id}
                  type="button"
                  className={`w-full rounded-md text-left ${selected ? 'bg-primary/10' : ''}`}
                  onClick={() => toggle(profile)}
                >
                  <ProfileCard profile={profile} showAction={false} />
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="variant-filled-primary" action={() => setOpen(false)}>
              {t('common.done', { defaultValue: 'Done' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
