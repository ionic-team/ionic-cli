import { IHookEngine } from '../definitions';

export class HookEngine implements IHookEngine {

  private hooks = new Map<string, ((args: any) => Promise<any>)[]>();

  async fire<T, U>(hook: string, args: T): Promise<U[]> {
    const registeredHooks = this.hooks.get(hook) || [];
    return Promise.all(registeredHooks.map((registerHook) => registerHook(args)));
  }

  register<T, U>(hook: string, listener: (args: T) => Promise<U>) {
    this.getRegistered<T, U>(hook).push(listener);

    return this;
  }

  getRegistered<T, U>(hook: string): ((args: T) => Promise<U>)[] {
    let registeredHooks = this.hooks.get(hook);
    if (!registeredHooks) {
      registeredHooks = [];
      this.hooks.set(hook, registeredHooks);
    }

    return registeredHooks;
  }

}
