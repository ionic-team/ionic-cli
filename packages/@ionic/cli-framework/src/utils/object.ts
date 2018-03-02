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
