import { BuildEvent, Builder, BuilderConfiguration, BuilderContext } from '@angular-devkit/architect';
import { BrowserBuilder } from '@angular-devkit/build-angular/src/browser';
import { BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { getSystemPath, join, normalize } from '@angular-devkit/core';
import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';

import { CordovaBuildBuilderSchema } from './schema';

export { CordovaBuildBuilderSchema };

export class CordovaBuildBuilder implements Builder<CordovaBuildBuilderSchema> {
  constructor(public context: BuilderContext) {}

  run(builderConfig: BuilderConfiguration<CordovaBuildBuilderSchema>): Observable<BuildEvent> {
    const browserBuilder = new BrowserBuilder(this.context); // TODO: shouldn't this use `architect.getBuilder()`?

    return this.buildBrowserConfig(builderConfig.options).pipe(
      concatMap(browserConfig => browserBuilder.run(browserConfig))
    );
  }

  buildBrowserConfig(options: CordovaBuildBuilderSchema): Observable<BuilderConfiguration<BrowserBuilderSchema>> {
    let browserConfig: BuilderConfiguration<BrowserBuilderSchema>;

    return of(null).pipe(// tslint:disable-line:no-null-keyword
      concatMap(() => this._getBrowserConfig(options)),
      tap(config => browserConfig = config),
      tap(() => this.prepareBrowserConfig(options, browserConfig.options)),
      concatMap(() => of(browserConfig))
    );
  }

  // Mutates browserOptions
  prepareBrowserConfig(options: CordovaBuildBuilderSchema, browserOptions: BrowserBuilderSchema) {
    const cordovaBasePath = normalize(options.cordovaBasePath ? options.cordovaBasePath : '.');

    // We always need to output the build to `www` because it is a hard
    // requirement of Cordova.
    browserOptions.outputPath = join(cordovaBasePath, normalize('www'));

    if (options.cordovaAssets) {
      const platformWWWPath = join(cordovaBasePath, normalize(`platforms/${options.platform}/platform_www`));

      // Add Cordova www assets that were generated whenever platform(s) and
      // plugin(s) are added. This includes `cordova.js`,
      // `cordova_plugins.js`, and all plugin JS.
      browserOptions.assets.push({
        glob: '**/*',
        input: getSystemPath(platformWWWPath),
        output: './',
      });

      // Register `cordova.js` as a global script so it is included in
      // `index.html`.
      browserOptions.scripts.push({
        input: getSystemPath(join(platformWWWPath, normalize('cordova.js'))),
        bundleName: 'cordova',
        lazy: false,
      });
    }
  }

  protected _getBrowserConfig(options: CordovaBuildBuilderSchema): Observable<BuilderConfiguration<BrowserBuilderSchema>> {
    const { architect } = this.context;
    const [ project, target, configuration ] = options.browserTarget.split(':');
    const browserTargetSpec = { project, target, configuration, overrides: {} };
    const builderConfig = architect.getBuilderConfiguration<BrowserBuilderSchema>(browserTargetSpec);

    return architect.getBuilderDescription(builderConfig).pipe(
      concatMap(browserDescription => architect.validateBuilderOptions(builderConfig, browserDescription))
    );
  }
}

export default CordovaBuildBuilder;
