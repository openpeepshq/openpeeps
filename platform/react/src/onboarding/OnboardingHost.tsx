import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../i18n';
import { Avatar } from '../components/profile/Avatar';
import { PostMarkdown } from '../components/post/Markdown';
import { type GuideIntent, useOnboardingGuide } from './useOnboardingGuide';

const QUICK_REPLIES: { intent: GuideIntent; key: string }[] = [
  { intent: 'orient', key: 'onboardingGuide.guide.introduce' },
  { intent: 'suggest_groups', key: 'onboardingGuide.guide.suggestGroup' },
  { intent: 'say_hello', key: 'onboardingGuide.guide.sayHi' },
];

export const OnboardingHost = () => {
  const t = useT();
  const guide = useOnboardingGuide();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  if (!guide.enabled) return null;

  const send = async (text: string) => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await guide.sendMessage(text);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {guide.dockOpen ? (
        <div
          className="border-border bg-background fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md rounded-xl border p-4 shadow-lg md:bottom-6 md:left-6 md:right-auto"
          role="dialog"
          aria-label={guide.config.displayName}
        >
          <div className="flex items-start gap-3">
            <Avatar profile={guide.chatbot} size={2.5} />
            <p className="text-sm">
              {t('onboardingGuide.dock.body', guide.tokens)}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" action={() => void guide.openGuide('orient')}>
              {t('onboardingGuide.dock.showAround')}
            </Button>
            <Button size="sm" variant="outline" action={guide.dismissDock}>
              {t('onboardingGuide.dock.explore')}
            </Button>
          </div>
        </div>
      ) : null}

      {guide.fabVisible && !guide.dockOpen && !guide.sheetOpen ? (
        <div className="fixed bottom-24 left-4 z-40 flex items-end md:bottom-6">
          <button
            type="button"
            className={`bg-primary text-primary-foreground flex size-12 items-center justify-center overflow-hidden rounded-full shadow-md ${guide.pulseFab ? 'ring-primary/40 ring-4' : ''}`}
            title={t('onboardingGuide.fab.label', guide.tokens)}
            onClick={() => void guide.openGuide('open')}
          >
            <Avatar profile={guide.chatbot} size={3} borderless />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="bg-surface border-border ml-1 flex size-8 items-center justify-center rounded-full border"
                title={t('onboardingGuide.fab.label', guide.tokens)}
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem onSelect={guide.pauseTips}>
                {t('onboardingGuide.fab.pause')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={guide.hideGuide}>
                {t('onboardingGuide.fab.hide')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      {guide.milestone ? (
        <div className="border-border bg-background fixed bottom-24 right-4 z-40 max-w-sm rounded-xl border p-3 shadow-lg md:bottom-6">
          <p className="text-sm">
            {t('onboardingGuide.toast.body', guide.tokens)}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" action={() => void guide.openGuide('next_step')}>
              {t('onboardingGuide.toast.sure')}
            </Button>
            <Button size="sm" variant="outline" action={guide.dismissMilestone}>
              {t('onboardingGuide.toast.noThanks')}
            </Button>
          </div>
        </div>
      ) : null}

      <Sheet
        open={guide.sheetOpen}
        onOpenChange={(open) => {
          if (!open) guide.closeGuide();
        }}
      >
        <SheetContent
          className="bg-background inset-y-0 left-auto right-0 top-0 flex h-full w-full max-w-md translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-l p-0 sm:max-w-md"
          aria-describedby={undefined}
        >
          <SheetHeader className="border-b p-4 text-left">
            <div className="flex items-center gap-3 pr-6">
              <Avatar profile={guide.chatbot} size={2.5} />
              <div>
                <SheetTitle>{guide.config.displayName}</SheetTitle>
                <SheetDescription>{guide.config.subtitle}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="bg-surface rounded-lg p-3 text-sm">
                {guide.introText.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : undefined}>
                    {line}
                  </p>
                ))}
              </div>
              {guide.messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg p-3 text-sm ${
                    message.profile.id === guide.chatbot?.id
                      ? 'bg-surface'
                      : 'bg-primary/10 ml-8'
                  }`}
                >
                  <PostMarkdown
                    source={
                      (message.data as { content?: string }).content || ''
                    }
                  />
                </div>
              ))}
              {!guide.chatbot ? (
                <p className="text-muted-foreground text-sm">
                  {t('onboardingGuide.guide.unavailable', guide.tokens)}
                </p>
              ) : null}
            </div>
            <div className="border-t p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <Button
                    key={reply.intent}
                    size="sm"
                    variant="outline"
                    action={() => void guide.openGuide(reply.intent)}
                  >
                    {t(reply.key)}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  action={() => {
                    void guide.openGuide('im_good');
                    guide.pauseTips();
                    guide.closeGuide();
                  }}
                >
                  {t('onboardingGuide.guide.imGood')}
                </Button>
              </div>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(draft);
                }}
              >
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t(
                    'onboardingGuide.guide.composerPlaceholder',
                    guide.tokens,
                  )}
                  maxLength={500}
                  disabled={!guide.chatbot || sending}
                />
                <Button
                  type="submit"
                  disabled={!guide.chatbot || sending || !draft.trim()}
                >
                  {t('common.form.send', { defaultValue: 'Send' })}
                </Button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
