export type MailpitMessage = {
  ID: string;
  From: { Address: string; Name?: string };
  To: { Address: string; Name?: string }[];
  Subject: string;
  Created: string;
};

export type MailpitListResponse = {
  total: number;
  messages: MailpitMessage[];
};

export type MailpitMessageDetail = MailpitMessage & {
  Text?: string;
  HTML?: string;
};

const mailpitBase = () =>
  (process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025').replace(/\/$/, '');

export const clearMailpit = async () => {
  const response = await fetch(`${mailpitBase()}/api/v1/messages`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 200) {
    throw new Error(
      `Mailpit delete failed: ${response.status} ${await response.text()}`,
    );
  }
};

export const listMailpitMessages = async (): Promise<MailpitMessage[]> => {
  const response = await fetch(`${mailpitBase()}/api/v1/messages`);
  if (!response.ok) {
    throw new Error(
      `Mailpit list failed: ${response.status} ${await response.text()}`,
    );
  }
  const body = (await response.json()) as MailpitListResponse;
  return body.messages ?? [];
};

export const getMailpitMessage = async (
  id: string,
): Promise<MailpitMessageDetail> => {
  const response = await fetch(`${mailpitBase()}/api/v1/message/${id}`);
  if (!response.ok) {
    throw new Error(
      `Mailpit get message failed: ${response.status} ${await response.text()}`,
    );
  }
  return response.json() as Promise<MailpitMessageDetail>;
};

export const waitForMailpitMessage = async (
  predicate: (message: MailpitMessage) => boolean,
  {
    timeoutMs = 30_000,
    pollMs = 500,
  }: { timeoutMs?: number; pollMs?: number } = {},
): Promise<MailpitMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const messages = await listMailpitMessages();
    const match = messages.find(predicate);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  const remaining = await listMailpitMessages().catch(() => []);
  const summary = remaining
    .slice(0, 10)
    .map((m) => `"${m.Subject}"→${m.To.map((t) => t.Address).join(',')}`)
    .join('; ');
  throw new Error(
    `Timed out waiting for Mailpit message (${remaining.length} in inbox${summary ? `: ${summary}` : ''})`,
  );
};

/** Extract first matching capture group from Mailpit HTML/text body. */
export const extractFromMailpitMessage = async (
  id: string,
  pattern: RegExp,
): Promise<string> => {
  const detail = await getMailpitMessage(id);
  const haystack = `${detail.HTML ?? ''}\n${detail.Text ?? ''}`;
  const match = haystack.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Pattern ${pattern} not found in Mailpit message ${id}`);
  }
  return match[1];
};
