import { IHook, IHookEngine } from '../definitions';

export class Hook<T, U> implements IHook<T, U> {
  constructor(
    public source: string,
    public name: string,
    public callable: (args: T) => Promise<U>
  ) {}
}

export class HookEngine implements IHookEngine {

  private hooks = new Map<string, IHook<any, any>[]>();

  async fire<T, U>(hook: string, args: T): Promise<U[]> {
    const registeredHooks = this.hooks.get(hook) || [];
    return Promise.all(registeredHooks.map((h) => h.callable(args)));
  }

  register<T, U>(source: string, hook: string, listener: (args: T) => Promise<U>) {
    const h = new Hook(source, hook, listener);
    this.getRegistered<T, U>(hook).push(h);
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
