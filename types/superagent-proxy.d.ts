declare module "superagent-proxy" {
  import * as superagent from 'superagent';

  module "superagent" {
    interface Request {
      proxy(url: string): this;
    }
  }

  function superagentProxy(s: typeof superagent): void;

  export = superagentProxy;
}
