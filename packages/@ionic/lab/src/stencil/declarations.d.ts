export {}; // https://github.com/Microsoft/TypeScript/issues/17736

declare global {
  interface StencilGlobalHTMLAttributes {
    allow?: string;
  }
}
