import * as ts from 'typescript';
import { camelCase, kebabCase, upperFirst } from 'lodash';

import {
  Rule,
  SchematicsException,
  apply,
  branchAndMerge,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  template,
  url,
} from '@angular-devkit/schematics';

import { addDeclarationToModule, addEntryComponentsToModule } from '../utils/angular/ast-utils';
import { InsertChange } from '../utils/angular/change';
import { buildRelativePath, findModuleFromOptions } from '../utils/angular/find-module';

import { Schema as PageOptions } from './schema';

function addPageToNgModule(utils: 'Declaration'|'EntryComponents', options: PageOptions): Rule {
  const { module } = options;

  if (!module) {
    throw new SchematicsException('module option is required.');
  }

  return host => {
    const text = host.read(module);

    if (!text) {
      throw new SchematicsException(`File ${module} does not exist.`);
    }

    const sourceText = text.toString('utf8');
    const source = ts.createSourceFile(module, sourceText, ts.ScriptTarget.Latest, true);

    const pagePath = (
      `/${options.sourceDir}/${options.path}/` +
      (options.flat ? '' : `${kebabCase(options.name)}/`) +
      `${kebabCase(options.name)}.page`
    );

    const relativePath = buildRelativePath(module, pagePath);
    const classifiedName = `${upperFirst(camelCase(options.name))}Page`;

    let addNgModuleMethod: Function;
    if (utils === 'Declaration') {
        addNgModuleMethod = addDeclarationToModule;
    } else if (utils === 'EntryComponents') {
        addNgModuleMethod = addEntryComponentsToModule;
    } else {
        throw new SchematicsException('add module method is not found.');
    }

    const Changes = addNgModuleMethod(source, module, classifiedName, relativePath);
    const Recorder = host.beginUpdate(module);

    for (const change of Changes) {
        if (change instanceof InsertChange) {
            Recorder.insertLeft(change.pos, change.toAdd);
        }
    }

    host.commitUpdate(Recorder);

    return host;
  };
}

function buildSelector(options: PageOptions) {
  let selector = kebabCase(options.name);

  if (options.prefix) {
    selector = `${options.prefix}-${selector}`;
  }

  return selector;
}

export default function (options: PageOptions): Rule {
  const { sourceDir } = options;

  if (!sourceDir) {
    throw new SchematicsException('sourceDir option is required.');
  }

  if (!options.path) {
    throw new SchematicsException('path option is required.');
  }

  return (host, context) => {
    options.module = findModuleFromOptions(host, options);
    options.selector = options.selector ? options.selector : buildSelector(options);

    const templateSource = apply(url('./files'), [
      options.spec ? noop() : filter(p => !p.endsWith('.spec.ts')),
      template({
        camelCase,
        kebabCase,
        upperFirst,
        'if-flat': (s: string) => options.flat ? '' : s,
        ...options,
      }),
      move(sourceDir),
    ]);

    return chain([
      branchAndMerge(chain([
        addPageToNgModule('Declaration', options),
        addPageToNgModule('EntryComponents', options),
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
