import repl from 'repl';
import net from 'net';
import { allpeepDb } from '@openpeeps/core/db';
import { hub } from '@openpeeps/core/events';
import type { Server } from 'node:net';

let replServer: Server | undefined = undefined;

export const startRepl = () => {
  if (!replServer) {
    console.log('Starting REPL ...');
    try {
      replServer = net
        .createServer(async (socket) => {
          const replServer = repl.start({
            prompt: 'AP-AT > ',
            input: socket,
            output: socket,
            terminal: true,
            useGlobal: false,
          });
          replServer.on('exit', function () {
            socket.end();
          });
          replServer.context.socket = socket;
          replServer.context.apat = {
            db: await allpeepDb(),
            hub,
          };
        })
        .listen(42424, '0.0.0.0');
    } catch (e) {
      console.log(`Could not start REPL: ${e}`);
    }
  }
};
