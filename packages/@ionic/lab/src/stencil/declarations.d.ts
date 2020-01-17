export {}; // https://github.com/Microsoft/TypeScript/issues/17736

declare module '@stencil/core/dist/declarations/jsx' {
  namespace JSXBase {
    interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
      allow?: string;
    }
  }
}
