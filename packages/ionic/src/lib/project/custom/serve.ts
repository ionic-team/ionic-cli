import { findClosestOpenPort } from '@ionic/utils-network';

import { CommandMetadata, CustomServeOptions, ServeDetails } from '../../../definitions';
import { input, strong } from '../../color';
import { RunnerException } from '../../errors';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, ServeRunner, ServeRunnerDeps } from '../../serve';

export class CustomServeRunner extends ServeRunner<CustomServeOptions> {
  constructor(protected readonly e: ServeRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {};
  }

  modifyOpenURL(url: string, options: CustomServeOptions): string {
    return url;
  }

  async serveProject(options: CustomServeOptions): Promise<ServeDetails> {
    const cli = this.getPkgManagerServeCLI();

    if (!await cli.resolveScript()) {
      throw new RunnerException(
        `Cannot perform serve.\n` +
        `Since you're using the ${strong('custom')} project type, you must provide the ${input(cli.script)} npm script so the Ionic CLI can serve your project.`
      );
    }

    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    const port = options.port = await findClosestOpenPort(options.port);

    await cli.serve(options);

    return {
      custom: true,
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }
}
