declare module "@ionic/app-scripts" {
  namespace appscripts {
    interface ServeConfig {
        httpPort: number;
        host: string;
        hostBaseUrl: string;
        rootDir: string;
        wwwDir: string;
        buildDir: string;
        isCordovaServe: boolean;
        launchBrowser: boolean;
        launchLab: boolean;
        browserToLaunch: string;
        useLiveReload: boolean;
        liveReloadPort: Number;
        notificationPort: Number;
        useServerLogs: boolean;
        notifyOnConsoleLog: boolean;
        useProxy: boolean;
    }
    interface BuildContext {
      rootDir?: string;
      tmpDir?: string;
      srcDir?: string;
      wwwDir?: string;
      wwwIndex?: string;
      buildDir?: string;
      nodeModulesDir?: string;
      moduleFiles?: string[];
      isProd?: boolean;
      isWatch?: boolean;
      runAot?: boolean;
      runMinifyJs?: boolean;
      runMinifyCss?: boolean;
      optimizeJs?: boolean;
      bundler?: string;
      fileCache?: any;
      inlineTemplates?: boolean;
      webpackWatch?: any;
      sassState?: BuildState;
      transpileState?: BuildState;
      templateState?: BuildState;
      bundleState?: BuildState;
      cordova?: any;
    }
    enum BuildState {
      SuccessfulBuild = 0,
      RequiresUpdate = 1,
      RequiresBuild = 2,
    }

    function generateContext(context?: BuildContext | undefined): BuildContext
    function build(context: BuildContext): Promise<void>;
    function serve(context: BuildContext): Promise<void | ServeConfig>;
  }

  export = appscripts;
}
