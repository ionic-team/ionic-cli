import { IHook, IHookEngine } from '../definitions';

export class Hook<T, U> implements IHook<T, U> {
  constructor(
    public source: string,
    public name: string,
    protected callable: (args: T) => Promise<U>
  ) {}

  fire(args: T): Promise<U> {
    return this.callable(args);
  }
}

export class HookEngine implements IHookEngine {

  private hooks = new Map<string, IHook<any, any>[]>();

  register<T, U>(source: string, hook: string, listener: (args: T) => Promise<U>) {
    const h = new Hook(source, hook, listener);
    this.getRegistered<T, U>(hook).push(h);
  }

  async fire<T, U>(hook: string, args: T): Promise<U[]> {
    const registeredHooks = this.hooks.get(hook) || [];
    return Promise.all(registeredHooks.map((h) => h.fire(args)));
  }

  getSources(hook: string) {
    return [...new Set(this.getRegistered(hook).map(h => h.source))];
  }

  hasSources(hook: string, sources: string[]) {
    return sources.filter(s => this.getSources(hook).includes(s)).length > 0;
  }

  deleteSource(source: string) {
    for (let [ hookName, hooks ] of this.hooks.entries()) {
      this.hooks.set(hookName, hooks.filter((h) => h.source !== source));
    }
  }

  getRegistered<T, U>(hook: string): IHook<T, U>[] {
    let registeredHooks = this.hooks.get(hook);
    if (!registeredHooks) {
      registeredHooks = [];
      this.hooks.set(hook, registeredHooks);
    }

    return registeredHooks;
  }

}
