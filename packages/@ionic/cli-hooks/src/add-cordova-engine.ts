import * as path from 'path';

import * as parse5 from 'parse5';
import { HookContext } from '@ionic/cli-utils';

import { exists, readFile, writeFile, unlink } from './utils/fs';
import { findElementByAttribute, findElementByTag, findElementsByTag } from './utils/html';

const ta = parse5.treeAdapters.default;

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
    app.assets.push({ glob: '**/*', input: platformWWW, output: './' });
    await writeFile(p, JSON.stringify(j, undefined, 2) + '\n');
  }

  const indexPath = path.resolve(ctx.project.srcDir, 'index.html');
  const origIndexPath = path.resolve(ctx.project.srcDir, 'index.html.orig');

  if (await exists(origIndexPath)) {
    await writeFile(indexPath, await readFile(origIndexPath));
    await unlink(origIndexPath);
  }

  const indexContents = await readFile(indexPath);
  const index = parse5.parse(indexContents) as parse5.AST.Default.Document;

  insertCordovaScript(index);

  const serialized = parse5.serialize(index);

  await Promise.all([
    writeFile(origIndexPath, indexContents),
    writeFile(indexPath, serialized),
  ]);
}

interface Details {
  engine: string;
  platform?: string;
}

function extractDetails(ctx: HookContext): Details | undefined {
  if (ctx.name !== 'build:before' && ctx.name !== 'serve:before') {
    return;
  }

  return ctx.name === 'serve:before' ? ctx.serve : ctx.build;
}

function insertCordovaScript(doc: parse5.AST.Default.Document): void {
  const rootNode = findElementByTag(doc.childNodes as parse5.AST.Default.Element[], 'html');

  if (!rootNode) {
    throw new Error('No root node in HTML file');
  }

  const namespaceURI = rootNode.namespaceURI;

  const headNode = findElementByTag(rootNode.childNodes as parse5.AST.Default.Element[], 'head');
  const bodyNode = findElementByTag(rootNode.childNodes as parse5.AST.Default.Element[], 'body');

  if (!headNode || !bodyNode) {
    throw new Error('No head or body node in HTML file');
  }

  const cdvattr = { name: 'src', value: 'cordova.js' };
  const scriptNodes = findElementsByTag([...headNode.childNodes, ...bodyNode.childNodes] as parse5.AST.Default.Element[], 'script');
  const scriptNode = findElementByAttribute(scriptNodes, cdvattr);

  if (!scriptNode) {
    const el = ta.createElement('script', namespaceURI, [cdvattr]);
    ta.appendChild(headNode, el);
  }
}
