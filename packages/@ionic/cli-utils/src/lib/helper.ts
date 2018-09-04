import * as path from 'path';

import { fork } from '@ionic/cli-framework/utils/shell';
import { fsMkdirp, fsOpen } from '@ionic/utils-fs';

import { IConfig, IPCMessage, IonicContext } from '../definitions';

export interface SendMessageDeps {
  config: IConfig;
  ctx: IonicContext;
}

export async function sendMessage({ config, ctx }: SendMessageDeps, msg: IPCMessage) {
  const dir = path.dirname(config.p);
  await fsMkdirp(dir);
  const fd = await fsOpen(path.resolve(dir, 'helper.log'), 'a');
  const p = fork(ctx.binPath, ['_', '--no-interactive'], { stdio: ['ignore', fd, fd, 'ipc'] });

  p.send(msg);
  p.disconnect();
  p.unref();
}
