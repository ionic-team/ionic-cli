import * as path from 'path';

import { HookContext } from '@ionic/cli-utils';

import { readFile, unlink, writeFile } from './utils/fs';

export default async function (ctx: HookContext) {
  const details = extractDetails(ctx);

  if (!details || details.engine !== 'cordova' || !details.platform) {
    return;
  }

  const platformWWW = path.resolve(ctx.project.dir, 'platforms', details.platform, 'platform_www');

  if (ctx.project.type === 'angular') {
    const p = path.resolve(ctx.project.dir, '.angular-cli.json');
    const j = JSON.parse(await readFile(p));
    const app = j.apps[0];
    app.assets = app.assets.filter((a: any) => a.input !== platformWWW);
    await writeFile(p, JSON.stringify(j, undefined, 2) + '\n');
  }

  const indexPath = path.resolve(ctx.project.srcDir, 'index.html');
  const origIndexPath = path.resolve(ctx.project.srcDir, 'index.html.orig');

  await writeFile(indexPath, await readFile(origIndexPath));
  await unlink(origIndexPath);
}

interface Details {
  engine: string;
  platform?: string;
}

function extractDetails(ctx: HookContext): Details | undefined {
  if (ctx.name !== 'build:after' && ctx.name !== 'serve:after') {
    return;
  }

  return ctx.name === 'serve:after' ? ctx.serve : ctx.build;
}
