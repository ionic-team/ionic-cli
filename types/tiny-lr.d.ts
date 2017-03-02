declare module "tiny-lr" {
  namespace tinyLr {}
  interface server {
    on: Function;
    listen: Function;
    close: Function;
    changed: Function;
  }
  function tinyLr(): server;

  export = tinyLr;
}
