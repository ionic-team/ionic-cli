import * as fs from 'fs';
import * as lodash from 'lodash';
import * as path from 'path';

import { makeDir, writeFileAtomicSync } from '../utils/fs';

export abstract class BaseConfig<T extends object> {
  constructor(readonly p: string) {}

  get c(): T {
    try {
      const config = JSON.parse(fs.readFileSync(this.p, 'utf8'));
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
    makeDir.sync(path.dirname(this.p));
    writeFileAtomicSync(this.p, JSON.stringify(value, undefined, 2));
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
