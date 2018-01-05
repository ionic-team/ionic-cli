import * as path from 'path';

import { fsOpen } from '@ionic/cli-framework/utils/fs';

import { CLIMeta, IConfig, IPCMessage } from '../definitions';
import { forkcmd } from './utils/shell';

export interface SendMessageDeps {
  config: IConfig;
  meta: CLIMeta;
}

export async function sendMessage({ config, meta }: SendMessageDeps, msg: IPCMessage) {
  const fd = await fsOpen(path.resolve(config.directory, 'helper.log'), 'a');
  const p = await forkcmd(meta.binPath, ['_', '--no-interactive'], { stdio: ['ignore', fd, fd, 'ipc'] });

  p.send(msg);
  p.disconnect();
  p.unref();
}
