import { useMemo, useRef, useState } from 'react';
import { ChevronDown, Image as ImageIcon } from 'lucide-react';
import type { Event, PostCreationData } from '@openpeeps/common/types';
import { Button, Input, Label } from '@openpeeps/react-ui';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { Avatar } from '../../profile';
import { ImageEditModal } from '../../form/ImageEditModal';
import { convertToWebpIfHeic } from '../../../lib/canvasUtils';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { MentionTextarea } from './MentionTextarea';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { EventTypeSwitcher } from './EventTypeSwitcher';
import { PostAudienceSelector } from './PostAudienceSelector';
import { audienceSummary } from './audienceChoices';

export interface EventFormProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
}

function dateToInputValue(value: string | undefined, wholeDay: boolean) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  if (wholeDay) return d.toISOString().slice(0, 10);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

const TIMEZONES =
  typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? Intl.supportedValuesOf('timeZone')
    : [Intl.DateTimeFormat().resolvedOptions().timeZone];

export function EventForm({ postData, onChange, isEdit = false }: EventFormProps) {
  const t = useT();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const { upload } = openpeepsApi.useMediaUpload();

  const event = postData.data as Event;
  const [showEndDate, setShowEndDate] = useState(event.end !== undefined);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedGroupName = useMemo(() => {
    if (!postData.groupId) return undefined;
    return me?.memberships?.find((m) => m.group.id === postData.groupId)?.group
      .displayName;
  }, [postData.groupId, me?.memberships]);

  const patchEvent = (patch: Partial<Event>) => {
    onChange({
      ...postData,
      data: { ...event, ...patch },
    });
  };

  const handleImageSelected = async (file: File) => {
    const processed = await convertToWebpIfHeic(file);
    if (processed.type.startsWith('image/')) {
      setPendingImage({
        file: processed,
        previewUrl: URL.createObjectURL(processed),
      });
      return;
    }
    const attachment = await upload({
      file: processed,
      usage: 'event-header-image',
    });
    patchEvent({ image: attachment.url ?? undefined });
  };

  return (
    <div className="space-y-6" data-testid="events-form-basic-details">
      <div className="space-y-2">
        {event.image ? (
          <img
            src={event.image}
            alt=""
            className="aspect-video w-full rounded-md object-cover"
          />
        ) : (
          <div className="bg-surface-100 flex aspect-video w-full items-center justify-center rounded-md border">
            <ImageIcon className="text-muted-foreground size-10" />
          </div>
        )}
        <Button
          variant="variant-ringed-surface"
          action={() => imageInputRef.current?.click()}
        >
          {t('events.form.imageDescription', {
            defaultValue: 'Add cover image',
          })}
        </Button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageSelected(file);
            e.target.value = '';
          }}
        />
      </div>

      {me && !isEdit ? (
        <button
          type="button"
          className="hover:bg-surface-100 flex w-full items-center gap-3 rounded-md border p-3 text-left"
          onClick={() => setAudienceOpen(true)}
        >
          <Avatar profile={me} size={3} borderless />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1 font-medium capitalize">
              {me.displayName ?? me.handle}
              <ChevronDown className="text-muted-foreground size-4" />
            </span>
            <span className="text-muted-foreground truncate text-sm">
              {audienceSummary(
                postData.visibility,
                t,
                selectedGroupName,
                postData.audience?.length,
              )}
            </span>
          </span>
        </button>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="event-name">
          {t('events.form.name', { defaultValue: 'Event name' })}
        </Label>
        <Input
          id="event-name"
          value={event.name ?? ''}
          onChange={(e) => patchEvent({ name: e.target.value })}
          data-testid="events-name-input"
        />
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          {t('events.form.description', { defaultValue: 'Description' })}
        </p>
        <MentionTextarea
          rows={6}
          value={event.content ?? ''}
          onChange={(content) => patchEvent({ content })}
          testId="events-description-input"
          placeholder={t('events.form.descriptionPlaceholder', {
            defaultValue: 'Tell people what this event is about…',
          })}
        />
        <ComposePreviewLinks content={event.content} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">
          {t('events.form.dateAndTimeTitle', { defaultValue: 'Date & time' })}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="event-start">
            {t('events.form.startDate', { defaultValue: 'Start' })}
          </Label>
          <Input
            id="event-start"
            type={event.wholeDay ? 'date' : 'datetime-local'}
            value={dateToInputValue(event.start, event.wholeDay ?? false)}
            onChange={(e) => {
              const start = toIso(e.target.value);
              if (start) patchEvent({ start });
            }}
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showEndDate}
            onChange={(e) => {
              const checked = e.target.checked;
              setShowEndDate(checked);
              if (checked && event.start) {
                const end = new Date(event.start);
                end.setHours(end.getHours() + 1);
                patchEvent({ end: end.toISOString() });
              } else {
                patchEvent({ end: undefined });
              }
            }}
          />
          <span className="text-sm">
            {t('events.form.addEndDate', { defaultValue: 'Add end date' })}
          </span>
        </label>

        {showEndDate ? (
          <div className="space-y-2">
            <Label htmlFor="event-end">
              {t('events.form.endDate', { defaultValue: 'End' })}
            </Label>
            <Input
              id="event-end"
              type={event.wholeDay ? 'date' : 'datetime-local'}
              value={dateToInputValue(event.end, event.wholeDay ?? false)}
              onChange={(e) => patchEvent({ end: toIso(e.target.value) })}
            />
          </div>
        ) : null}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={event.wholeDay ?? false}
            onChange={(e) => patchEvent({ wholeDay: e.target.checked })}
          />
          <span className="text-sm">
            {t('events.form.wholeDay', { defaultValue: 'Whole day' })}
          </span>
        </label>

        <div className="space-y-2">
          <Label htmlFor="event-timezone">
            {t('events.form.timezone', { defaultValue: 'Timezone' })}
          </Label>
          <select
            id="event-timezone"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={event.timeZone ?? TIMEZONES[0]}
            onChange={(e) => patchEvent({ timeZone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">
          {t('events.form.location', { defaultValue: 'Location' })}
        </h2>
        <EventTypeSwitcher
          event={event}
          isEdit={isEdit}
          onChange={(next) =>
            onChange({ ...postData, data: next })
          }
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">
          {t('events.form.people', { defaultValue: 'People' })}
        </h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={event.attendeeListPublic ?? false}
            onChange={(e) =>
              patchEvent({ attendeeListPublic: e.target.checked })
            }
          />
          <span className="text-sm">
            {t('events.form.attendeeListPublic', {
              defaultValue: 'Show attendee list publicly',
            })}
          </span>
        </label>
      </div>

      {!isEdit ? (
        <PostAudienceSelector
          open={audienceOpen}
          onClose={() => setAudienceOpen(false)}
          type="event"
          visibility={postData.visibility}
          groupId={postData.groupId ?? undefined}
          audience={postData.audience ?? []}
          showDirect
          onConfirm={(settings) => {
            const audience = settings.audience;
            const includesMe = audience?.some((p) => p.id === me?.id);
            onChange({
              ...postData,
              visibility: settings.visibility,
              groupId: settings.groupId ?? undefined,
              audience:
                settings.visibility === 'direct'
                  ? includesMe
                    ? audience ?? undefined
                    : [...(audience ?? []), ...(me ? [me] : [])]
                  : undefined,
            });
          }}
        />
      ) : null}

      {pendingImage ? (
        <ImageEditModal
          file={pendingImage.file}
          previewUrl={pendingImage.previewUrl}
          open
          onClose={() => {
            URL.revokeObjectURL(pendingImage.previewUrl);
            setPendingImage(null);
          }}
          onConfirm={async (file) => {
            URL.revokeObjectURL(pendingImage.previewUrl);
            setPendingImage(null);
            const attachment = await upload({
              file,
              usage: 'event-header-image',
            });
            patchEvent({ image: attachment.url ?? undefined });
          }}
        />
      ) : null}
    </div>
  );
}
