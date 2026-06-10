import { useState } from 'react';
import type { PublicProfile } from '@openpeeps/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { ProfileCard } from '../../profile';

export interface MentionPickerProps {
  onSelect: (profile: PublicProfile) => void;
}

export function MentionPicker({ onSelect }: MentionPickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { openpeepsApi } = useOpenpeeps();
  const profilesQuery = openpeepsApi.useSearchProfiles(query);

  const profiles = (profilesQuery.data?.pages ?? [])
    .flat()
    .map((item) => item.data)
    .slice(0, 8);

  return (
    <>
      <Button
        variant="variant-ghost-primary"
        action={() => setOpen(true)}
        title={t('posts.form.mention', { defaultValue: 'Mention someone' })}
      >
        @
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('posts.form.mentionTitle', { defaultValue: 'Mention a member' })}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('posts.form.mentionSearch', {
              defaultValue: 'Search by handle…',
            })}
          />
          <div className="max-h-64 overflow-y-auto">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="w-full text-left"
                onClick={() => {
                  onSelect(profile);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <ProfileCard profile={profile} showAction={false} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
