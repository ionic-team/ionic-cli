import { SpawnOptions, fork } from 'child_process';
import * as path from 'path';

import { fsOpen } from '@ionic/cli-framework/utils/fs';

import { IConfig, IPCMessage, IonicContext } from '../definitions';

export interface SendMessageDeps {
  config: IConfig;
  ctx: IonicContext;
}

export async function sendMessage({ config, ctx }: SendMessageDeps, msg: IPCMessage) {
  const fd = await fsOpen(path.resolve(config.directory, 'helper.log'), 'a');
  const p = fork(ctx.binPath, ['_', '--no-interactive'], <SpawnOptions>{ stdio: ['ignore', fd, fd, 'ipc'] });

  p.send(msg);
  p.disconnect();
  p.unref();
}
