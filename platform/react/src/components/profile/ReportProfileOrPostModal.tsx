import { useState } from 'react';
import type { PublicPost, PublicProfile } from '@openpeepshq/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useServerInfo } from '../server-data';

export interface ReportProfileOrPostModalProps {
  reportType: 'profile' | 'post';
  profile?: PublicProfile;
  post?: PublicPost;
  open: boolean;
  onClose: () => void;
}

type ReportCategory = 'spam' | 'violation' | 'other';

export function ReportProfileOrPostModal({
  reportType,
  profile,
  post,
  open,
  onClose,
}: ReportProfileOrPostModalProps) {
  const t = useT();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const createReport = openpeepsApi.createReportAction();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ReportCategory>('spam');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories: { value: ReportCategory; label: string }[] = [
    {
      value: 'spam',
      label: t('reports.categories.spamDescription', {
        defaultValue: 'Spam or misleading',
      }),
    },
    {
      value: 'violation',
      label: t('reports.categories.violationDescription', {
        defaultValue: 'Violates community rules',
      }),
    },
    {
      value: 'other',
      label: t('reports.categories.otherDescription', {
        defaultValue: 'Something else',
      }),
    },
  ];

  const submit = async () => {
    setSubmitting(true);
    try {
      await createReport({
        postIds: post ? [post.id] : [],
        profileId: profile?.id ?? post?.profile.id ?? '',
        report: { comment, category, forward: false },
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const communityName = serverInfo.communityConfig?.info.name ?? 'community';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setStep(1);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {reportType === 'profile'
              ? t('reports.create.profile.title', {
                  defaultValue: 'Report @{{handle}}',
                  handle: profile?.handle,
                })
              : t('reports.create.post.title', { defaultValue: 'Report post' })}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <>
            <p className="text-sm text-muted-foreground">
              {t(`reports.create.${reportType}.description`, {
                defaultValue: 'Help moderators understand what is wrong.',
              })}
            </p>
            <div className="space-y-2 py-2">
              {categories.map((item) => (
                <label
                  key={item.value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="category"
                    checked={category === item.value}
                    onChange={() => setCategory(item.value)}
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t(`reports.create.${reportType}.anythingElse`, {
                defaultValue: 'Anything else we should know?',
              })}
            />
            <DialogFooter>
              <Button variant="variant-ringed-surface" action={onClose}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                variant="variant-filled-primary"
                action={() => setStep(2)}
              >
                {t(`reports.create.${reportType}.continue`, {
                  defaultValue: 'Continue',
                })}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <h3 className="font-semibold">
              {t(`reports.create.${reportType}.confirmMessageHeading`, {
                defaultValue: 'Send report?',
                handle: profile?.handle ?? post?.profile.handle,
              })}
            </h3>
            {reportType === 'profile' ? (
              <p className="text-sm text-muted-foreground">
                {t('reports.create.profile.confirmMessageDescription', {
                  defaultValue:
                    'Moderators at {{community}} will review this report.',
                  handle: profile?.handle,
                  community: communityName,
                })}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                variant="variant-ringed-surface"
                action={() => setStep(1)}
              >
                {t('reports.create.back', { defaultValue: 'Back' })}
              </Button>
              <Button
                variant="variant-filled-error"
                action={submit}
                disabled={submitting}
              >
                {t('reports.create.sendReport', { defaultValue: 'Send report' })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
