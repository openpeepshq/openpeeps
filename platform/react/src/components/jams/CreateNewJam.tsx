import { useState } from 'react';
import { Eye } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useCreateNewJamForm } from '../../hooks/jams/useCreateNewJamForm';
import { Avatar, ProfilesInput } from '../profile';
import { PostAudienceSelector } from '../post/post-form/PostAudienceSelector';

export interface CreateNewJamModalProps {
  onClose: () => void;
}

export function CreateNewJamModal({ onClose }: CreateNewJamModalProps) {
  const t = useT();
  const [audienceOpen, setAudienceOpen] = useState(false);
  const {
    postData,
    event,
    isAdmin,
    submitting,
    error,
    visibilityDescription,
    selectedGroupName,
    selectedModerators,
    directAudience,
    patchEvent,
    setWaitingRoom,
    handleModeratorsChange,
    applyAudience,
    handleCreate,
    handleSchedule,
  } = useCreateNewJamForm({ onClose });

  return (
    <>
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('jams.create.title')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jam-name">{t('jams.form.name')}</Label>
              <Input
                id="jam-name"
                value={event.name ?? ''}
                onChange={(e) => patchEvent({ name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="text-muted-foreground size-4" />
                <Label>{t('visibility.event.title')}</Label>
              </div>
              <button
                type="button"
                className="hover:bg-surface rounded-button flex w-full items-center gap-2 border p-3 text-left text-sm"
                onClick={() => setAudienceOpen(true)}
              >
                <span className="flex-1">{visibilityDescription}</span>
                {postData.visibility === 'group' && selectedGroupName ? (
                  <span className="text-primary truncate text-sm">
                    {selectedGroupName}
                  </span>
                ) : null}
                {postData.visibility === 'direct' ? (
                  <span className="flex items-center">
                    {directAudience.slice(0, 5).map((profile) => (
                      <Avatar
                        key={profile.id}
                        profile={profile}
                        size={1.5}
                        borderless
                        containerClassName="-ml-2"
                      />
                    ))}
                    {directAudience.length > 5 ? (
                      <span className="ml-1 text-sm">
                        +{directAudience.length - 5}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
              <p className="text-muted-foreground text-xs">
                {t('events.form.visibilityNotChangeable')}
              </p>
            </div>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={event.jam?.waitingRoom ?? false}
                onChange={(e) => setWaitingRoom(e.target.checked)}
              />
              <span className="flex flex-col">
                <span className="text-sm">
                  {t('events.form.jamWaitingRoom')}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t('events.form.jamWaitingRoomDescription')}
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <Label>{t('events.form.jamModerators')}</Label>
              <ProfilesInput
                value={selectedModerators}
                onChange={handleModeratorsChange}
                placeholder={t('events.form.jamModeratorsDescription', {
                  defaultValue: 'Click to select jam moderators',
                })}
              />
            </div>
          </div>

          {error ? <p className="text-error text-sm">{error}</p> : null}

          <DialogFooter>
            {isAdmin ? (
              <Button variant="outline" action={handleSchedule}>
                {t('jams.createFlow.schedule')}
              </Button>
            ) : null}
            <Button
              variant="default"
              disabled={submitting}
              action={handleCreate}
            >
              {t('jams.start.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PostAudienceSelector
        open={audienceOpen}
        onClose={() => setAudienceOpen(false)}
        type="event"
        visibility={postData.visibility}
        groupId={postData.groupId ?? undefined}
        audience={postData.audience ?? []}
        showDirect
        onConfirm={applyAudience}
      />
    </>
  );
}
