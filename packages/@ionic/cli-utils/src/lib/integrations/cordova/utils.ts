import * as path from 'path';

import { OptionFilters, filterCommandLineOptions, filterCommandLineOptionsByGroup, unparseArgs } from '@ionic/cli-framework';
import { fsReadFile, fsUnlink, fsWriteFile, pathExists } from '@ionic/cli-framework/utils/fs';

import * as parse5Type from 'parse5';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption } from '../../../definitions';
import { OptionGroup } from '../../../constants';
import { findElementByAttribute, findElementByTag, findElementsByTag } from '../../utils/html';

/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
export function filterArgumentsForCordova(metadata: CommandMetadata, options: CommandLineOptions): string[] {
  const m = { ...metadata };

  if (!m.options) {
    m.options = [];
  }

  const globalCordovaOpts: CommandMetadataOption[] = [
    {
      name: 'verbose',
      summary: '',
      type: Boolean,
      groups: [OptionGroup.Cordova],
    },
  ];

  m.options.push(...globalCordovaOpts);

  const results = filterCommandLineOptionsByGroup(m, options, OptionGroup.Cordova);

  results['target'] = results['cordova-target'];
  delete results['cordova-target'];

  const args = unparseArgs(results, { useEquals: false, allowCamelCase: true });
  const i = args.indexOf('--');

  if (i >= 0) {
    args.splice(i, 1); // join separated args onto main args, use them verbatim
  }

  return [m.name, ...args];
}

export function generateBuildOptions(metadata: CommandMetadata, inputs: CommandLineInputs, options: CommandLineOptions): CommandLineOptions {
  const [ platform ] = inputs;
  const includesAppScriptsGroup = OptionFilters.includesGroups(OptionGroup.AppScripts);
  const excludesCordovaGroup = OptionFilters.excludesGroups(OptionGroup.Cordova);
  const results = filterCommandLineOptions(metadata, options, o => excludesCordovaGroup(o) || includesAppScriptsGroup(o));

  return {
    ...results,
    externalAddressRequired: true,
    nobrowser: true,
    engine: 'cordova',
    platform,
  };
}

export async function addCordovaEngine(dir: string): Promise<void> {
  const parse5 = await import('parse5');

  const indexPath = path.resolve(dir, 'index.html');
  const origIndexPath = path.resolve(dir, 'index.html.orig');

  if (await pathExists(origIndexPath)) {
    await removeCordovaEngine(dir);
  }

  const indexContents = await fsReadFile(indexPath, { encoding: 'utf8' });
  const index = parse5.parse(indexContents) as parse5Type.AST.Default.Document;

  await insertCordovaScript(index);

  const serialized = parse5.serialize(index);

  await Promise.all([
    fsWriteFile(origIndexPath, indexContents, { encoding: 'utf8' }),
    fsWriteFile(indexPath, serialized, { encoding: 'utf8' }),
  ]);
}

export async function removeCordovaEngine(dir: string): Promise<void> {
  const indexPath = path.resolve(dir, 'index.html');
  const origIndexPath = path.resolve(dir, 'index.html.orig');

  await fsWriteFile(indexPath, await fsReadFile(origIndexPath, { encoding: 'utf8' }), { encoding: 'utf8' });
  await fsUnlink(origIndexPath);
}

async function insertCordovaScript(doc: parse5Type.AST.Default.Document): Promise<void> {
  const parse5 = await import('parse5');

  const ta = parse5.treeAdapters.default;
  const rootNode = findElementByTag(doc.childNodes as parse5Type.AST.Default.Element[], 'html');

  if (!rootNode) {
    throw new Error('No root node in HTML file');
  }

  const namespaceURI = rootNode.namespaceURI;

  const headNode = findElementByTag(rootNode.childNodes as parse5Type.AST.Default.Element[], 'head');
  const bodyNode = findElementByTag(rootNode.childNodes as parse5Type.AST.Default.Element[], 'body');

  if (!headNode || !bodyNode) {
    throw new Error('No head or body node in HTML file');
  }

  const cdvattr = { name: 'src', value: 'cordova.js' };
  const scriptNodes = findElementsByTag([...headNode.childNodes, ...bodyNode.childNodes] as parse5Type.AST.Default.Element[], 'script');
  const scriptNode = findElementByAttribute(scriptNodes, cdvattr);

  if (!scriptNode) {
    const el = ta.createElement('script', namespaceURI, [cdvattr]);
    ta.appendChild(headNode, el);
  }
}
