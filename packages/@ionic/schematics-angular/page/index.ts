import { camelCase, kebabCase, upperFirst } from 'lodash';

import {
  Rule,
  SchematicsException,
  apply,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';

import { Schema as PageOptions } from './schema';

export default function (options: PageOptions): Rule {
  const { path, sourceDir } = options;

  if (!sourceDir) {
    throw new SchematicsException('sourceDir option is required.');
  }

  if (!path) {
    throw new SchematicsException('path option is required.');
  }

  return (host, context) => {
    const templateSource = apply(url('./files'), [
      template({ ...options, camelCase, kebabCase, upperFirst, path }),
      move(sourceDir),
    ]);

    return chain([mergeWith(templateSource)])(host, context);
  };
}
