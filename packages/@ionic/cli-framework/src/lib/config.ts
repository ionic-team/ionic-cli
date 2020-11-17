import { mkdirpSync } from '@ionic/utils-fs';
import * as fs from 'fs';
import * as lodash from 'lodash';
import * as path from 'path';
import * as writeFileAtomic from 'write-file-atomic';

export interface BaseConfigOptions {
  /**
   * The number of spaces to use when writing the JSON file.
   */
  spaces?: string | number;

  /**
   * If specified, the class will operate on a nested object within the config
   * file navigated to by this path prefix, an array of object path keys.
   *
   * For example, to operate on `c` object within `{ a: { b: { c: {} } } }`,
   * use `pathPrefix` of `['a', 'b', 'c']`.
   */
  pathPrefix?: readonly string[];
}

export abstract class BaseConfig<T extends object> {
  protected readonly spaces: string | number;
  protected readonly pathPrefix: readonly string[];

  constructor(readonly p: string, { spaces = 2, pathPrefix = [] }: BaseConfigOptions = {}) {
    this.spaces = spaces;
    this.pathPrefix = pathPrefix;
  }

  get file() {
    try {
      return this._getFile();
    } catch (e) {
      return {};
    }
  }

  get c(): T {
    try {
      const file = this._getFile();
      const navigated = this.pathPrefix.length === 0 ? file : lodash.get(file, [...this.pathPrefix]);
      const config = typeof navigated === 'object' ? navigated : {};

      return lodash.assign({}, this.provideDefaults(config), config);
    } catch (e) {
      if (e.code === 'ENOENT' || e.name === 'SyntaxError') {
        const value = this.provideDefaults({});
        const v = this.pathPrefix.length === 0 ? value : lodash.set({}, [...this.pathPrefix], value);
        this._setFile(v);
        return value;
      }

      throw e;
    }
  }

  set c(value: T) {
    const v = this.pathPrefix.length === 0 ? value : lodash.set(this.file, [...this.pathPrefix], value);
    this._setFile(v);
  }

  get<P extends keyof T>(property: P): T[P];
  get<P extends keyof T>(property: P, defaultValue: NonNullable<T[P]>): NonNullable<T[P]>;
  get<P extends keyof T>(property: P, defaultValue?: T[P]): T[P] {
    const value: any = this.c[property];

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

  private _getFile(): any {
    const contents = fs.readFileSync(this.p, 'utf8');
    return JSON.parse(contents);
  }

  private _setFile(value: any): void {
    mkdirpSync(path.dirname(this.p));
    writeFileAtomic.sync(this.p, JSON.stringify(value, undefined, this.spaces) + '\n');
  }
}
