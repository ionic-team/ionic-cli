import * as path from 'path';

import * as parse5 from 'parse5';
import { HookContext } from '@ionic/cli-utils';

import { readFile, writeFile } from './utils/fs';
import { findElementByAttribute, findElementByTag, findElementsByTag } from './utils/html';

const ta = parse5.treeAdapters.default;

export default async function (ctx: HookContext) {
  if (ctx.name !== 'build:before' || ctx.build.engine !== 'cordova') {
    return;
  }

  const indexPath = path.resolve(ctx.project.srcDir, 'index.html');
  const origIndexPath = path.resolve(ctx.project.srcDir, 'index.html.orig');
  const indexContents = await readFile(indexPath);

  const index = parse5.parse(indexContents) as parse5.AST.Default.Document;
  const rootNode = findElementByTag(index.childNodes as parse5.AST.Default.Element[], 'html');

  if (!rootNode) {
    throw new Error('No root node in index.html');
  }

  const namespaceURI = rootNode.namespaceURI;

  const headNode = findElementByTag(rootNode.childNodes as parse5.AST.Default.Element[], 'head');
  const bodyNode = findElementByTag(rootNode.childNodes as parse5.AST.Default.Element[], 'body');

  if (!headNode || !bodyNode) {
    throw new Error('No head or body node in index.html');
  }

  const cdvattr = { name: 'src', value: 'cordova.js' };
  const scriptNodes = findElementsByTag([...headNode.childNodes, ...bodyNode.childNodes] as parse5.AST.Default.Element[], 'script');
  const scriptNode = findElementByAttribute(scriptNodes, cdvattr);

  if (!scriptNode) {
    const el = ta.createElement('script', namespaceURI, [cdvattr]);
    ta.appendChild(headNode, el);
  }

  const serialized = parse5.serialize(index);

  await Promise.all([
    writeFile(origIndexPath, indexContents),
    writeFile(indexPath, serialized),
  ]);
}
