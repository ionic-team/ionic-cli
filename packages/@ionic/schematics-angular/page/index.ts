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

import { addDeclarationToModule, addSymbolToNgModuleMetadata } from '@schematics/angular/utility/ast-utils';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import { getWorkspace } from '@schematics/angular/utility/config';
import { buildRelativePath, findModuleFromOptions } from '@schematics/angular/utility/find-module';
import { parseName } from '@schematics/angular/utility/parse-name';
import { validateHtmlSelector, validateName } from '@schematics/angular/utility/validation';

import { Schema as PageOptions } from './schema';

function addEntryComponentsToModule(source: any, modulePath: string, classifiedName: string, importPath: string | null): Change[] {
  return addSymbolToNgModuleMetadata(source, modulePath, 'entryComponents', classifiedName, importPath);
}

function addPageToNgModule(options: PageOptions): Rule {
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
      `/${options.path}/` +
      (options.flat ? '' : `${kebabCase(options.name)}/`) +
      `${kebabCase(options.name)}.page`
    );

    const relativePath = buildRelativePath(module, pagePath);
    const classifiedName = `${upperFirst(camelCase(options.name))}Page`;

    const Changes = [
      ...addDeclarationToModule(source, module, classifiedName, relativePath),
      ...addEntryComponentsToModule(source, module, classifiedName, null), // tslint:disable-line:no-null-keyword
    ];

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
  return (host, context) => {
    const workspace = getWorkspace(host);

    if (!options.project) {
      options.project = Object.keys(workspace.projects)[0];
    }

    const project = workspace.projects[options.project];

    if (options.path === undefined) {
      options.path = `/${project.root}/src/app`;
    }

    options.module = findModuleFromOptions(host, options);

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;
    options.selector = options.selector ? options.selector : buildSelector(options);

    validateName(options.name);
    validateHtmlSelector(options.selector);

    const templateSource = apply(url('./files'), [
      options.spec ? noop() : filter(p => !p.endsWith('.spec.ts')),
      template({
        camelCase,
        kebabCase,
        upperFirst,
        'if-flat': (s: string) => options.flat ? '' : s,
        ...options,
      }),
      move(parsedPath.path),
    ]);

    return chain([
      branchAndMerge(chain([
        addPageToNgModule(options),
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
