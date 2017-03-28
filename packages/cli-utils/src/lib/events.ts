import { ICLIEventEmitter } from '../definitions';

export class CLIEventEmitter implements ICLIEventEmitter {

  private events = new Map<string, ((args: any) => Promise<any>)[]>();

  async emit<T, U>(event: string, args: T): Promise<U[]> {
    const eventListeners = this.events.get(event) || [];
    return Promise.all(eventListeners.map((eventListener) => eventListener(args)));
  }

  on<T, U>(event: string, listener: (args: T) => Promise<U>) {
    this.getListeners<T, U>(event).push(listener);

    return this;
  }

  getListeners<T, U>(event: string): ((args: T) => Promise<U>)[] {
    let eventListeners = this.events.get(event);
    if (!eventListeners) {
      eventListeners = [];
      this.events.set(event, eventListeners);
    }

    return eventListeners;
  }

}
