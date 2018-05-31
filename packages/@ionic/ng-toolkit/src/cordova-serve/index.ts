import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import { BuildEvent, Builder, BuilderConfiguration, BuilderContext, BuilderDescription } from '@angular-devkit/architect';

import { CordovaServeBuilderSchema } from './schema';

export class CordovaServeBuilder implements Builder<CordovaServeBuilderSchema> {
  constructor(public context: BuilderContext) {}

  run(builderConfig: BuilderConfiguration<CordovaServeBuilderSchema>): Observable<BuildEvent> {
    return of(null).pipe(// tslint:disable-line:no-null-keyword
      concatMap(() => this._startDevServer(builderConfig.options))
    );
  }

  protected _startDevServer(options: CordovaServeBuilderSchema): Observable<any> {
    const [ project, target, configuration ] = options.devServerTarget.split(':');
    const { port, host } = options;
    const devServerTargetSpec = { project, target, configuration, overrides: { port, host } };
    const builderConfig = this.context.architect.getBuilderConfiguration</* DevServerBuilderSchema */any>(devServerTargetSpec);

    let devServerDescription: BuilderDescription;

    return this.context.architect.getBuilderDescription(builderConfig).pipe(
      tap(description => devServerDescription = description),
      tap(() => this.context.architect.validateBuilderOptions(builderConfig, devServerDescription)),
      concatMap(() => of(this.context.architect.getBuilder(devServerDescription, this.context))),
      concatMap(builder => builder.run(builderConfig))
    );
  }
}

export default CordovaServeBuilder;
