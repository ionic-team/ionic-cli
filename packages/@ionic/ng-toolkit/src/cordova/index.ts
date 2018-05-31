import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import { BuildEvent, Builder, BuilderConfiguration, BuilderContext } from '@angular-devkit/architect';
// https://github.com/angular/devkit/issues/963
const { BrowserBuilder } = require('@angular-devkit/build-angular/src/browser'); // tslint:disable-line
import { getSystemPath, join, normalize } from '@angular-devkit/core';

import { CordovaBuilderSchema } from './schema';

export class CordovaBuilder implements Builder<CordovaBuilderSchema> {
  constructor(public context: BuilderContext) {}

  run(builderConfig: BuilderConfiguration<CordovaBuilderSchema>): Observable<BuildEvent> {
    let browserConfig: /* BrowserBuilderSchema */any;
    const browserBuilder = new BrowserBuilder(this.context);

    const { platform } = builderConfig.options;

    return of(null).pipe(// tslint:disable-line:no-null-keyword
      concatMap(() => this._getBrowserConfig(builderConfig.options)),
      tap(config => browserConfig = config),
      tap(() => {
        // We always need to output the build to `www` because it is a hard
        // requirement of Cordova.
        browserConfig.options.outputPath = 'www';

        const platformWWWPath = normalize(`platforms/${platform}/platform_www`);

        // Add Cordova www assets that were generated whenever platform(s) and
        // plugin(s) are added. This includes `cordova.js`,
        // `cordova_plugins.js`, and all plugin JS.
        browserConfig.options.assets.push({
          glob: '**/*',
          input: getSystemPath(platformWWWPath),
          output: './',
        });

        // Register `cordova.js` as a global script so it is included in
        // `index.html`.
        browserConfig.options.scripts.push({
          input: getSystemPath(join(platformWWWPath, normalize('cordova.js'))),
          bundleName: 'cordova',
        });
      }),
      concatMap(() => browserBuilder.run(browserConfig))
    );
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
