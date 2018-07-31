import { BuildEvent, Builder, BuilderConfiguration, BuilderContext, BuilderDescription } from '@angular-devkit/architect';
import { Path, virtualFs } from '@angular-devkit/core';
import * as ζfs from 'fs';
import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';

import { CordovaBuildBuilder } from '../cordova-build';

import { CordovaServeBuilderSchema } from './schema';

const { DevServerBuilder } = require('@angular-devkit/build-angular/src/dev-server'); // tslint:disable-line

export class CordovaServeBuilder implements Builder<CordovaServeBuilderSchema> {
  constructor(public context: BuilderContext) {}

  run(builderConfig: BuilderConfiguration<CordovaServeBuilderSchema>): Observable<BuildEvent> {
    const [ project, target, configuration ] = builderConfig.options.devServerTarget.split(':');
    const { port, host, proxyConfig } = builderConfig.options;
    const devServerTargetSpec = { project, target, configuration, overrides: { port, host, proxyConfig } };
    const devServerBuilderConfig = this.context.architect.getBuilderConfiguration</* DevServerBuilderSchema */any>(devServerTargetSpec);

    // TODO: architect doesn't use the defaults from schema
    devServerBuilderConfig.options.watch = true;
    devServerBuilderConfig.options.liveReload = true;

    let devServerDescription: BuilderDescription;

    return this.context.architect.getBuilderDescription(devServerBuilderConfig).pipe(
      tap(description => devServerDescription = description),
      tap(() => this.context.architect.validateBuilderOptions(devServerBuilderConfig, devServerDescription)),
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

  buildWebpackConfig(root: Path, projectRoot: Path, host: virtualFs.Host<ζfs.Stats>, browserOptions: /* BrowserBuilderSchema */any) {
    const { platform } = this.cordovaServeOptions;
    const [ project, target, configuration ] = this.cordovaServeOptions.cordovaBuildTarget.split(':');
    const cordovaBuildTargetSpec = { project, target, configuration, overrides: { platform } };
    const cordovaBuildTargetConfig = this.context.architect.getBuilderConfiguration(cordovaBuildTargetSpec);

    const builder = new CordovaBuildBuilder(this.context);
    builder.prepareBrowserConfig(cordovaBuildTargetConfig.options, browserOptions);

    return super.buildWebpackConfig(root, projectRoot, host, browserOptions);
  }
}

export default CordovaServeBuilder;
