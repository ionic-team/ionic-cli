declare module "superagent-proxy" {
  import * as superagent from 'superagent';

  function superagentProxy(s: typeof superagent): void;

  export = superagentProxy;
}
