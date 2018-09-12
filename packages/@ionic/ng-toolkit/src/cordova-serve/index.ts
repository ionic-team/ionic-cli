import { BuildEvent, Builder, BuilderConfiguration, BuilderContext, BuilderDescription } from '@angular-devkit/architect';
import { BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { DevServerBuilder, DevServerBuilderOptions } from '@angular-devkit/build-angular/src/dev-server';
import { Path, virtualFs } from '@angular-devkit/core';
import * as ζfs from 'fs';
import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';

import { CordovaBuildBuilder, CordovaBuildBuilderSchema } from '../cordova-build';

import { CordovaServeBuilderSchema } from './schema';

export class CordovaServeBuilder implements Builder<CordovaServeBuilderSchema> {
  constructor(public context: BuilderContext) {}

  run(builderConfig: BuilderConfiguration<CordovaServeBuilderSchema>): Observable<BuildEvent> {
    const [ project, target, configuration ] = builderConfig.options.devServerTarget.split(':');
    const { port, host, proxyConfig } = builderConfig.options;
    const devServerTargetSpec = { project, target, configuration, overrides: { port, host, proxyConfig } };
    const devServerBuilderConfig = this.context.architect.getBuilderConfiguration<DevServerBuilderOptions>(devServerTargetSpec);

    let devServerDescription: BuilderDescription;

    return this.context.architect.getBuilderDescription(devServerBuilderConfig).pipe(
      tap(description => devServerDescription = description),
      concatMap(() => this.context.architect.validateBuilderOptions(devServerBuilderConfig, devServerDescription)),
      concatMap(() => of(new CordovaDevServerBuilder(this.context, builderConfig.options))),
      // concatMap(() => of(this.context.architect.getBuilder(devServerDescription, this.context))),
      concatMap(builder => builder.run(devServerBuilderConfig))
    );
  }
}

class CordovaDevServerBuilder extends DevServerBuilder {
  constructor(context: BuilderContext, public cordovaServeOptions: CordovaServeBuilderSchema) {
    super(context);
  }

  // run(builderConfig: BuilderConfiguration</* DevServerBuilderOptions */any>): Observable<BuildEvent> {
  //   return super.run(builderConfig);
  // }

  buildWebpackConfig(root: Path, projectRoot: Path, host: virtualFs.Host<ζfs.Stats>, browserOptions: BrowserBuilderSchema) {
    const { platform } = this.cordovaServeOptions;
    const [ project, target, configuration ] = this.cordovaServeOptions.cordovaBuildTarget.split(':');
    const cordovaBuildTargetSpec = { project, target, configuration, overrides: { platform } };
    const cordovaBuildTargetConfig = this.context.architect.getBuilderConfiguration<CordovaBuildBuilderSchema>(cordovaBuildTargetSpec);

    const builder = new CordovaBuildBuilder(this.context);
    builder.prepareBrowserConfig(cordovaBuildTargetConfig.options, browserOptions);

    return super.buildWebpackConfig(root, projectRoot, host, browserOptions);
  }
}

export default CordovaServeBuilder;
