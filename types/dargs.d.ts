declare module 'dargs' {
  interface MinimistParsedArgs {
    [arg: string]: any;
    '--'?: string[];
    _: string[];
  }

  namespace dargs {
    export interface Opts {
      excludes?: any[];
      includes?: any[];
      aliases?: {
        [key: string]: string;
      };
      useEquals?: boolean;
      ignoreFalse?: boolean;
      allowCamelCase?: boolean;
    }
  }

  function dargs(input: MinimistParsedArgs, options?: dargs.Opts): string[];
  export = dargs;
}
