import { makeDir, writeFileAtomicSync } from '@ionic/utils-fs';
import * as fs from 'fs';
import * as lodash from 'lodash';
import * as path from 'path';

export interface BaseConfigOptions {
  /**
   * If specified, the class will operate on a nested object within the config
   * file navigated to by this path prefix, an array of object path keys.
   *
   * For example, to operate on `c` object within `{ a: { b: { c: {} } } }`,
   * use `pathPrefix` of `['a', 'b', 'c']`.
   */
  pathPrefix?: ReadonlyArray<string>;
}

export abstract class BaseConfig<T extends object> {
  protected readonly pathPrefix: ReadonlyArray<string>;

  constructor(readonly p: string, { pathPrefix = [] }: BaseConfigOptions = {}) {
    this.pathPrefix = pathPrefix;
  }

  get file() {
    const contents = fs.readFileSync(this.p, 'utf8');
    return JSON.parse(contents);
  }

  get c(): T {
    try {
      const file = this.file;
      const navigated = this.pathPrefix.length === 0 ? file : lodash.get(file, [...this.pathPrefix]);
      const config = typeof navigated === 'object' ? navigated : {};

      return lodash.assign({}, this.provideDefaults(config), config);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return this.provideDefaults({});
      }

      if (e.name === 'SyntaxError') {
        writeFileAtomicSync(this.p, '');
        return this.provideDefaults({});
      }

      throw e;
    }
  }

  set c(value: T) {
    const v = this.pathPrefix.length === 0 ? value : lodash.set(this.file, [...this.pathPrefix], value);

    makeDir.sync(path.dirname(this.p));
    writeFileAtomicSync(this.p, JSON.stringify(v, undefined, 2));
  }

  get<P extends keyof T>(property: P): T[P];
  get<P extends keyof T>(property: P, defaultValue: NonNullable<T[P]>): NonNullable<T[P]>;
  get<P extends keyof T>(property: P, defaultValue?: T[P]): T[P] {
    const value = this.c[property];

    if (defaultValue && typeof value === 'undefined') {
      return defaultValue;
    }

    return value;
  }

  set<P extends keyof T>(property: P, value: T[P]): void {
    const config = this.c;
    config[property] = value;
    this.c = config;
  }

  unset<P extends keyof T>(property: P): void {
    const config = this.c;
    delete config[property];
    this.c = config;
  }

  abstract provideDefaults(c: Partial<Readonly<T>>): T;
}
