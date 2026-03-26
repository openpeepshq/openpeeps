import { Command } from 'commander';
import { stopEgress, stopRecording } from '@openpeeps/core/jams';
import { findPost } from '@openpeeps/core/posts';

export const registerJamsCommand = (program: Command) => {
  const jams = program.command('jams').description('Jam utilities');

  jams
    .command('stopRecording')
    .alias('stop-recording')
    .description('Stop a jam recording by post id')
    .argument('<postId>', 'Jam post id')
    .action(async (postId: string) => {
      await stopRecordingCommand(postId);
    });

  jams
    .command('stopEgress')
    .alias('stop-egress')
    .description('Stop an egress by id')
    .argument('<egressId>', 'Egress id')
    .action(async (egressId: string) => {
      await stopEgressCommand(egressId);
    });
};

const stopRecordingCommand = async (postId: string) => {
  const jamEvent = await findPost(postId);
  if (!jamEvent) {
    console.log('Jam not found.');
    process.exit(1);
  }

  const recording = await stopRecording(jamEvent);
  if (!recording) {
    console.log('Recording not found.');
    process.exit(1);
  }

  console.log(JSON.stringify(recording, null, 2));
};

const stopEgressCommand = async (egressId: string) => {
  await stopEgress(egressId);
  console.log(`Egress stopped: ${egressId}`);
};
