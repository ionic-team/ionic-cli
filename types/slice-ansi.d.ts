declare module 'slice-ansi' {
  namespace sliceAnsi {}
  function sliceAnsi(input: string, beginSlice: number, endSlice?: number): string;
  export = sliceAnsi;
}
