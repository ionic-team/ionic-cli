declare module "tiny-lr" {
  import * as http from 'http';

  namespace TinyLR {}

  interface TinyLRServer {
    listen(port: number, cb?: () => {});
    close();
    changed(p: any);
  }

  function TinyLR(): TinyLRServer;

  export = TinyLR;
}
