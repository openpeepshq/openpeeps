import { useState, type ReactNode } from 'react';
import { MessageSquare } from 'lucide-react';
import { useT } from '../../i18n';
import { JamChatDrawer } from './JamChatDrawer';

export interface JamObserverShellProps {
  children: ReactNode;
}

/** Observer layout wrapper with read-only persisted chat drawer. */
export function JamObserverShell({ children }: JamObserverShellProps) {
  const t = useT();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div
      className="relative flex h-screen w-screen flex-1 overflow-hidden"
      data-lk-theme="default"
    >
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <div className="absolute bottom-4 right-4 z-20">
        <button
          type="button"
          title={t('jams.drawer.chatTitle', { defaultValue: 'Chat' })}
          className={`lk-button ${chatOpen ? 'lk-button-active' : ''}`}
          onClick={() => setChatOpen((open) => !open)}
        >
          <MessageSquare className="size-5" />
        </button>
      </div>
      <JamChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        readOnly
      />
    </div>
  );
}
