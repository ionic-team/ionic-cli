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

import { addDeclarationToModule } from '../utils/angular/ast-utils';
import { InsertChange } from '../utils/angular/change';
import { buildRelativePath, findModuleFromOptions } from '../utils/angular/find-module';

import { Schema as ComponentOptions } from './schema';

function addDeclarationToNgModule(options: ComponentOptions): Rule {
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

    const componentPath = (
      `/${options.sourceDir}/${options.path}/` +
      (options.flat ? '' : `${kebabCase(options.name)}/`) +
      `${kebabCase(options.name)}.component`
    );

    const relativePath = buildRelativePath(module, componentPath);
    const classifiedName = `${upperFirst(camelCase(options.name))}Component`;
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

export default function (options: ComponentOptions): Rule {
  // change install directory
  if (options.path) {
    options.path = options.path.replace('app/ion-components', 'app/components') ;
  }

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
        addDeclarationToNgModule(options),
        mergeWith(templateSource),
      ])),
    ])(host, context);
  };
}
