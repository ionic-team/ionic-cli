import {
  CommandLineInputs,
  CommandLineOptions,
  LOGGER_LEVELS,
  combine,
  validators,
} from '@ionic/cli-framework';
import { columnar } from '@ionic/cli-framework/utils/format';
import { sleep } from '@ionic/utils-process';
import * as chalk from 'chalk';

import { CommandMetadata } from '../../definitions';
import { isSuperAgentError } from '../../guards';
import { input, strong } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

import { PackageBuild } from './build';

interface BinaryDeployment {
  id: number;
  user: any;
  build: any;
  type: string;
  distributionCredential: any;
  destination: string;
  message: string;
  distributionBuildId: number;
  status: string;
}

interface DistributionBuild {
  job_id: number;
  id: string;
  caller_id: number;
  created: string;
  state: string;
  distribution_credential_name: string;
  package_build: PackageBuild;
  binary_deployment: BinaryDeployment;
  distribution_trace: string;
}

export class DeployCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    const dashUrl = this.env.config.getDashUrl();

    return {
      name: 'deploy',
      type: 'project',
      summary: 'Deploys a binary to a destination, such as an app store using Appflow',
      description: `
This command deploys a binary to a destination using Ionic Appflow. While running, the remote log is printed to the terminal.

The command takes two parameters: the numeric ID of the package build that previously created the binary and the name of the destination where the binary is going to be deployed.
Both can be retrieved from the Dashboard[^dashboard].
      `,
      footnotes: [
        {
          id: 'dashboard',
          url: dashUrl,
        },
      ],
      exampleCommands: ['123456789 "My app store destination"'],
      inputs: [
        {
          name: 'build-id',
          summary: `The build id of the desired successful package build`,
          validators: [validators.required, validators.numeric],
        },
        {
          name: 'destination',
          summary:
            'The destination to deploy the build artifact to the app store',
          validators: [validators.required],
        },
      ],
    };
  }

  async preRun(
    inputs: CommandLineInputs,
    options: CommandLineOptions
  ): Promise<void> {
    if (!inputs[0]) {
      const buildIdInputInput = await this.env.prompt({
        type: 'input',
        name: 'build-id',
        message: `The build ID on Appflow:`,
        validate: v => combine(validators.required, validators.numeric)(v),
      });
      inputs[0] = buildIdInputInput;
    }

    if (!inputs[1]) {
      const destinationInputInput = await this.env.prompt({
        type: 'input',
        name: 'destination',
        message: `The destination to deploy the build artifact to the app store:`,
        validate: v => combine(validators.required)(v),
      });
      inputs[1] = destinationInputInput;
    }
  }

  async run(
    inputs: CommandLineInputs,
    options: CommandLineOptions
  ): Promise<void> {
    if (!this.project) {
      throw new FatalException(
        `Cannot run ${input(
          'ionic package build'
        )} outside a project directory.`
      );
    }

    const token = await this.env.session.getUserToken();
    const appflowId = await this.project.requireAppflowId();
    const [buildId, destination] = inputs;

    let build:
      | DistributionBuild
      | PackageBuild = await this.createDeploymentBuild(
      appflowId,
      token,
      buildId,
      destination
    );
    const distBuildID = build.job_id;

    const details = columnar(
      [
        ['App ID', strong(appflowId)],
        ['Deployment ID', strong(build.binary_deployment.id.toString())],
        ['Package Build ID', strong(buildId.toString())],
        ['Destination', strong(build.distribution_credential_name)],
      ],
      { vsep: ':' }
    );

    this.env.log.ok(`Deployment initiated\n` + details + '\n\n');

    build = await this.tailBuildLog(appflowId, distBuildID, token);
    if (build.state !== 'success') {
      throw new Error('Build failed');
    }
  }

  async createDeploymentBuild(
    appflowId: string,
    token: string,
    buildId: string,
    destination: string
  ): Promise<DistributionBuild> {
    const { req } = await this.env.client.make(
      'POST',
      `/apps/${appflowId}/distributions/verbose_post`
    );
    req.set('Authorization', `Bearer ${token}`).send({
      package_build_id: buildId,
      distribution_credential_name: destination,
    });

    try {
      const res = await this.env.client.do(req);
      return res.data as DistributionBuild;
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
        const apiErrorMessage =
          e.response.body.error && e.response.body.error.message
            ? e.response.body.error.message
            : 'Api Error';
        throw new FatalException(
          `Unable to create deployment build: ` + apiErrorMessage
        );
      } else {
        throw e;
      }
    }
  }

  async tailBuildLog(
    appflowId: string,
    buildId: number,
    token: string
  ): Promise<PackageBuild> {
    let build;
    let start = 0;
    const ws = this.env.log.createWriteStream(LOGGER_LEVELS.INFO, false);

    let isCreatedMessage = false;
    while (
      !(build && (build.state === 'success' || build.state === 'failed'))
    ) {
      await sleep(5000);
      build = await this.getGenericBuild(appflowId, buildId, token);
      if (build && build.state === 'created' && !isCreatedMessage) {
        ws.write(
          chalk.yellow(
            'Concurrency limit reached: build will start as soon as other builds finish.'
          )
        );
        isCreatedMessage = true;
      }
      const trace = build.distribution_trace;
      if (trace && trace.length > start) {
        ws.write(trace.substring(start));
        start = trace.length;
      }
    }
    ws.end();

    return build;
  }

  async getGenericBuild(
    appflowId: string,
    buildId: number,
    token: string
  ): Promise<PackageBuild> {
    const { req } = await this.env.client.make(
      'GET',
      `/apps/${appflowId}/builds/${buildId}`
    );
    req.set('Authorization', `Bearer ${token}`).send();

    try {
      const res = await this.env.client.do(req);
      return res.data as PackageBuild;
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
        const apiErrorMessage =
          e.response.body.error && e.response.body.error.message
            ? e.response.body.error.message
            : 'Api Error';
        throw new FatalException(
          `Unable to get build ${buildId}: ` + apiErrorMessage
        );
      } else {
        throw e;
      }
    }
  }
}
