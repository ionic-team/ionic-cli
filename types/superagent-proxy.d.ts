declare module "superagent-proxy" {
  import superagent = require('superagent');

  namespace superagentProxy {}

  function superagentProxy(s: typeof superagent): void;

  export = superagentProxy;
}
