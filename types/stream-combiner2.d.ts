declare module 'stream-combiner2' {
  function combine(...writables: NodeJS.WritableStream[]): NodeJS.WritableStream;

  namespace combine {}

  export = combine;
}
