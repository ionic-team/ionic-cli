import { findClosestOpenPort } from '@ionic/utils-network';
import chalk from 'chalk';

import { CommandMetadata, ServeDetails, VueServeOptions } from '../../../definitions';
import { RunnerException } from '../../errors';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, ServeRunner, ServeRunnerDeps } from '../../serve';

export class VueServeRunner extends ServeRunner<VueServeOptions> {
  constructor(protected readonly e: ServeRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {};
  }

  modifyOpenURL(url: string, options: VueServeOptions): string {
    return url;
  }

  async serveProject(options: VueServeOptions): Promise<ServeDetails> {
    const cli = this.getPkgManagerServeCLI();

    if (!await cli.resolveScript()) {
      throw new RunnerException(
        `Cannot perform serve.\n` +
        `Since you're using the ${chalk.bold('Vue')} project type, you must provide the ${chalk.green(cli.script)} npm script so the Ionic CLI can serve your project.`
      );
    }

    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    const port = options.port = await findClosestOpenPort(options.port);

    await cli.serve(options);

    return {
      custom: false,
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }
}
