declare module "tiny-lr" {
  import * as http from 'http';

  namespace TinyLR {}

  interface TinyLRServer {
    listen(port: number, host: string, cb?: () => {}): void;
    close(): void;
    changed(p: any): void;
  }

  function TinyLR(): TinyLRServer;

  export = TinyLR;
}
