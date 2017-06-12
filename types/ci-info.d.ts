declare module 'ci-info' {
  namespace ci_info {
    interface CIInfo {
      name: string;
      isCI: boolean;
    }
  }

  var ci_info: ci_info.CIInfo;

  export = ci_info;
}
