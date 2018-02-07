import * as path from 'path';

import { HookContext } from '@ionic/cli-utils';

import { readFile, unlink, writeFile } from './utils/fs';

export default async function (ctx: HookContext) {
  if (ctx.name !== 'build:after' && ctx.name !== 'serve:after') {
    return;
  }

  const engine = ctx.name === 'serve:after' ? ctx.serve.engine : ctx.build.engine;

  if (engine !== 'cordova') {
    return;
  }

  const indexPath = path.resolve(ctx.project.srcDir, 'index.html');
  const origIndexPath = path.resolve(ctx.project.srcDir, 'index.html.orig');
  const origIndexContents = await readFile(origIndexPath);

  await writeFile(indexPath, origIndexContents);
  await unlink(origIndexPath);
}
