import * as fs from 'fs';
import * as path from 'path';
import * as lodash from 'lodash';

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

  get<P extends keyof T>(property: P): T[P] {
    return this.c[property];
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
