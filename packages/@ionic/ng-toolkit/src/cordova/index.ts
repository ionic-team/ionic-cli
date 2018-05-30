// import * as fs from 'fs'; // type import

import { BuildEvent, Builder, BuilderConfiguration, BuilderContext } from '@angular-devkit/architect';
// https://github.com/angular/devkit/issues/963
// import { BrowserBuilder } from '@angular-devkit/build-angular/src/browser';
// import { BrowserBuilderSchema, NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
const { BrowserBuilder } = require('@angular-devkit/build-angular/src/browser'); // tslint:disable-line
// import { Path, resolve, virtualFs } from '@angular-devkit/core';

import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
// import * as webpack from 'webpack';

import { CordovaBuilderSchema } from './schema';

export class CordovaBuilder implements Builder<CordovaBuilderSchema> {
  constructor(public context: BuilderContext) {}

  run(builderConfig: BuilderConfiguration<CordovaBuilderSchema>): Observable<BuildEvent> {
    // const { root } = this.context.workspace;
    // const projectRoot = resolve(root, builderConfig.root);
    // const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
    const browserBuilder = new BrowserBuilder(this.context);
    let browserOptions: /* BrowserBuilderSchema */any;

    return of(null).pipe(// tslint:disable-line:no-null-keyword
      concatMap(() => this._getBrowserConfig(builderConfig.options)),
      tap(opts => browserOptions = opts),
      concatMap(() => browserBuilder.run(browserOptions))
      // concatMap(() => new Observable(obs => {
      //   const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, browserOptions);
      //   const webpackCompiler = webpack(webpackConfig);

      //   webpackCompiler.run((err, stats) => {
      //     if (err) {
      //       return obs.error(err);
      //     }

      //     obs.next({ success: !stats.hasErrors() });
      //     obs.complete();
      //   });
      // }))
    );
  }

  // buildWebpackConfig(root: Path, projectRoot: Path, host: virtualFs.Host<fs.Stats>, browserOptions: /* BrowserBuilderSchema */any) {
  //   const browserBuilder = new BrowserBuilder(this.context);
  //   const webpackConfig = browserBuilder.buildWebpackConfig(root, projectRoot, host, browserOptions as /* NormalizedBrowserBuilderSchema */any);

  //   return webpackConfig;
  // }

  protected _getBrowserConfig(options: CordovaBuilderSchema): Observable</* BrowserBuilderSchema */any> {
    const { architect } = this.context;
    const [ project, target, configuration ] = options.browserTarget.split(':');
    const browserTargetSpec = { project, target, configuration, overrides: {} };
    const builderConfig = architect.getBuilderConfiguration</* BrowserBuilderSchema */any>(browserTargetSpec);

    return architect.getBuilderDescription(builderConfig).pipe(
      concatMap(browserDescription => architect.validateBuilderOptions(builderConfig, browserDescription))
    );
  }
}

export default CordovaBuilder;
