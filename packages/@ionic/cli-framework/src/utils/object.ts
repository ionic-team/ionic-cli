export function createCaseInsensitiveObject<T>() {
  return new Proxy<{ [key: string]: T; }>({}, CaseInsensitiveProxyHandler);
}

export const CaseInsensitiveProxyHandler: ProxyHandler<any> = {
  has: (obj, prop) => {
    return conformPropertyKey(prop) in obj;
  },
  get: (obj, prop) => {
    return obj[conformPropertyKey(prop)];
  },
  set: (obj, prop, value) => {
    obj[conformPropertyKey(prop)] = value;
    return true;
  },
  deleteProperty: (obj, prop) => {
    return delete obj[conformPropertyKey(prop)];
  },
};

const conformPropertyKey = (prop: PropertyKey) => typeof prop === 'string' ? prop.toLowerCase() : prop;

export type AliasedMapKey = string | symbol;

export class AliasedMap<K, V> extends Map<AliasedMapKey | K, AliasedMapKey | V> {
  getAliases(): Map<AliasedMapKey, AliasedMapKey[]> {
    const aliasmap = new Map<AliasedMapKey, AliasedMapKey[]>();

    // TODO: waiting for https://github.com/Microsoft/TypeScript/issues/18562
    const aliases = [...this.entries()].filter(([, v]) => typeof v === 'string' || typeof v === 'symbol') as [AliasedMapKey, AliasedMapKey][];

    aliases.forEach(([alias, cmd]) => {
      const cmdaliases = aliasmap.get(cmd) || [];
      cmdaliases.push(alias);
      aliasmap.set(cmd, cmdaliases);
    });

    return aliasmap;
  }

  resolveAliases(key: AliasedMapKey | K): V | undefined {
    const r = this.get(key);

    if (typeof r !== 'string' && typeof r !== 'symbol') {
      return r;
    }

    return this.resolveAliases(r);
  }
}
