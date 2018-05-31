import * as fs from 'fs'; // type import

import * as webpack from 'webpack';
import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import { BuildEvent, Builder, BuilderConfiguration, BuilderContext } from '@angular-devkit/architect';
// https://github.com/angular/devkit/issues/963
const { BrowserBuilder } = require('@angular-devkit/build-angular/src/browser'); // tslint:disable-line
const { statsErrorsToString, statsToString, statsWarningsToString } = require('@angular-devkit/build-angular/src/angular-cli-files/utilities/stats'); // tslint:disable-line
const { getWebpackStatsConfig } = require('@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/utils'); // tslint:disable-line
import { Path, getSystemPath, normalize, resolve, virtualFs } from '@angular-devkit/core';

import { CordovaBuilderSchema } from './schema';

export class CordovaBuilder implements Builder<CordovaBuilderSchema> {
  constructor(public context: BuilderContext) {}

  run(builderConfig: BuilderConfiguration<CordovaBuilderSchema>): Observable<BuildEvent> {
    const { root } = this.context.workspace;
    const projectRoot = resolve(root, builderConfig.root);
    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
    let browserConfig: /* BrowserBuilderSchema */any;

    const { platform } = builderConfig.options;

    return of(null).pipe(// tslint:disable-line:no-null-keyword
      concatMap(() => this._getBrowserConfig(builderConfig.options)),
      tap(config => browserConfig = config),
      concatMap(() => new Observable(obs => {
        const { options } = browserConfig;

        if (options.watch) {
          throw new Error('The `--watch` option is not implemented for Cordova builds.');
        }

        const platformWWWPath = resolve(projectRoot, normalize(`platforms/${platform}/platform_www`));

        options.assets.push({
          glob: '**/*',
          input: getSystemPath(platformWWWPath),
          output: './',
        });

        options.scripts.push({
          input: getSystemPath(resolve(platformWWWPath, normalize('cordova.js'))),
          bundleName: 'cordova',
        });

        const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, options);
        const webpackCompiler = webpack(webpackConfig);

        webpackCompiler.run((err, stats) => {
          if (err) {
            return obs.error(err);
          }

          const statsConfig = getWebpackStatsConfig(options.verbose);
          const json = stats.toJson(statsConfig);

          if (options.verbose) {
            this.context.logger.info(stats.toString(statsConfig));
          } else {
            this.context.logger.info(statsToString(json, statsConfig));
          }

          if (stats.hasWarnings()) {
            this.context.logger.warn(statsWarningsToString(json, statsConfig));
          }

          if (stats.hasErrors()) {
            this.context.logger.error(statsErrorsToString(json, statsConfig));
          }

          obs.next({ success: !stats.hasErrors() });
          obs.complete();
        });
      }))
    );
  }

  buildWebpackConfig(root: Path, projectRoot: Path, host: virtualFs.Host<fs.Stats>, browserOptions: /* BrowserBuilderSchema */any) {
    const browserBuilder = new BrowserBuilder(this.context);
    const webpackConfig = browserBuilder.buildWebpackConfig(root, projectRoot, host, browserOptions as /* NormalizedBrowserBuilderSchema */any);

    return webpackConfig;
  }

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
