declare module "glob-watcher" {
  namespace globWatcher {}
  function globWatcher(globs: string[]): NodeJS.EventEmitter;

  export = globWatcher;
}
