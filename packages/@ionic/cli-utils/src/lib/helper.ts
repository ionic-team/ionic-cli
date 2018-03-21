import * as path from 'path';

import { fsOpen } from '@ionic/cli-framework/utils/fs';

import { IConfig, IPCMessage, IonicContext } from '../definitions';
import { forkcmd } from './utils/shell';

export interface SendMessageDeps {
  config: IConfig;
  ctx: IonicContext;
}

export async function sendMessage({ config, ctx }: SendMessageDeps, msg: IPCMessage) {
  const fd = await fsOpen(path.resolve(config.directory, 'helper.log'), 'a');
  const p = await forkcmd(ctx.binPath, ['_', '--no-interactive'], { stdio: ['ignore', fd, fd, 'ipc'] });

  p.send(msg);
  p.disconnect();
  p.unref();
}
