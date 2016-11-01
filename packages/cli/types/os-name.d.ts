declare module "os-name" {
  namespace osName {}
  function osName(): string;
  function osName(platform: string, release: string): string;

  export = osName;
}
