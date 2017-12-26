import * as path from 'path';

import { fsOpen } from '@ionic/cli-framework/utils/fs';

import { IPCMessage, IonicEnvironment } from '../definitions';
import { forkcmd } from './utils/shell';

export async function sendMessage(env: IonicEnvironment, msg: IPCMessage) {
  const fd = await fsOpen(path.resolve(env.config.directory, 'helper.log'), 'a');
  const p = await forkcmd(env.meta.binPath, ['_', '--no-interactive'], { stdio: ['ignore', fd, fd, 'ipc'] });

  p.send(msg);
  p.disconnect();
  p.unref();
}
