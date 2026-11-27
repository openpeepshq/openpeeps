import { appendJamTranscriptSegment } from '@openpeepshq/core/transcription';
import { TRANSCRIBER_AGENT_NAME } from '@openpeepshq/core/transcription';
import { postIdFromJamRoomName } from '@openpeepshq/common/lib';

/**
 * LiveKit agent name the jam room dispatches to. Shared with core
 * (`TRANSCRIBER_AGENT_NAME`) so the room name a jam joins and the agent that
 * answers it can never drift apart. The agents package is loaded at process
 * start so this worker can ship without pulling its types into core.
 */
const AGENT_NAME = TRANSCRIBER_AGENT_NAME;

type JobContext = {
  room: {
    name?: string;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
  };
  connect: () => Promise<void>;
};

type AgentsModule = {
  defineAgent: (definition: {
    entry: (ctx: JobContext) => Promise<void>;
  }) => unknown;
  cli: { runApp: (options: unknown) => Promise<void> };
  WorkerOptions: new (options: { agentName: string }) => unknown;
};

/** Room name -> post id. Rooms are named by `jamRoomName` (the postId), so use
 *  the canonical parser shared with core instead of a local strip. */
const jamIdFromRoom = (roomName: string | undefined) =>
  roomName ? postIdFromJamRoomName(roomName) : '';

const entry = async (ctx: JobContext) => {
  await ctx.connect();
  const jamId = jamIdFromRoom(ctx.room.name);
  ctx.room.on('dataReceived', (payload: unknown) => {
    const bytes = payload instanceof Uint8Array ? payload : undefined;
    const text = bytes ? new TextDecoder().decode(bytes).trim() : '';
    if (!text || !jamId) return;
    void appendJamTranscriptSegment({
      jamId,
      recordingId: `live:${jamId}`,
      segment: { text },
    });
  });
};

export const runTranscriber = async () => {
  // Resolved at runtime so core and CI do not depend on the agents native stack.
  const specifier = '@livekit/agents';
  let agents: AgentsModule;
  try {
    agents = (await import(specifier)) as AgentsModule;
  } catch (error) {
    throw new Error(
      `The real-time transcriber needs ${specifier} installed in this process.`,
      { cause: error },
    );
  }
  agents.defineAgent({ entry });
  await agents.cli.runApp(new agents.WorkerOptions({ agentName: AGENT_NAME }));
};

runTranscriber().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
