import * as ts from 'typescript';
import { camelCase, kebabCase, upperFirst } from 'lodash';

import {
  Rule,
  SchematicsException,
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';

import { addDeclarationToModule } from '@schematics/angular/utility/ast-utils';
import { InsertChange } from '@schematics/angular/utility/change';
import { buildRelativePath, findModuleFromOptions } from '@schematics/angular/utility/find-module';

import { Schema as PageOptions } from './schema';

function addDeclarationToNgModule(options: PageOptions): Rule {
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
    const declarationChanges = addDeclarationToModule(source, module, classifiedName, relativePath);
    const declarationRecorder = host.beginUpdate(module);

    for (const change of declarationChanges) {
      if (change instanceof InsertChange) {
        declarationRecorder.insertLeft(change.pos, change.toAdd);
      }
    }

    host.commitUpdate(declarationRecorder);

    return host;
  };
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

    const templateSource = apply(url('./files'), [
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
        addDeclarationToNgModule(options),
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
