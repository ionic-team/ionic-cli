import { CommandLineInputs, CommandLineOptions, LOGGER_LEVELS, MetadataGroup } from '@ionic/cli-framework';
import { columnar } from '@ionic/cli-framework/utils/format';
import { sleep } from '@ionic/utils-process';
import * as chalk from 'chalk';
import * as Debug from 'debug';

import { CommandMetadata } from '../../definitions';
import { isSuperAgentError } from '../../guards';
import { input, strong, weak } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

const debug = Debug('ionic:commands:deploy:build');

interface DeployBuild {
  job_id: number;
  id: string;
  caller_id: number;
  created: string;
  finished: string;
  state: string;
  commit: any;
  automation_id: number;
  environment_id: number;
  native_config_id: number;
  automation_name: string;
  environment_name: string;
  job: any;
  pending_channels: string[];
}

export class BuildCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    const dashUrl = this.env.config.getDashUrl();

    return {
      name: 'build',
      type: 'project',
      summary: 'Create a deploy build on Appflow',
      description: `
This command creates a deploy build on Ionic Appflow. While the build is running, it prints the remote build log to the terminal.

Customizing the build:
- The ${input('--environment')} and ${input('--channel')} options can be used to customize the groups of values exposed to the build.

Apart from ${input('--commit')}, every option can be specified using the full name setup within the Appflow Dashboard[^dashboard].
`,
      footnotes: [
        {
          id: 'dashboard',
          url: dashUrl,
        },
      ],
      exampleCommands: [
        '',
        '--environment="My Custom Environment Name"',
        '--commit=2345cd3305a1cf94de34e93b73a932f25baac77c',
        '--channel="Master"',
        '--channel="Master" --channel="My Custom Channel"',
      ],
      options: [
        {
          name: 'environment',
          summary: 'The group of environment variables exposed to your build',
          type: String,
          spec: { value: 'name' },
        },
        {
          name: 'channel',
          summary: 'The channel you want to auto deploy the build to. This can be repeated multiple times if multiple channels need to be specified.',
          type: String,
          spec: { value: 'name' },
        },
        {
          name: 'commit',
          summary: 'Commit (defaults to HEAD)',
          type: String,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'sha1' },
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic deploy build')} outside a project directory.`);
    }

    const token = await this.env.session.getUserToken();
    const appflowId = await this.project.requireAppflowId();

    if (!options.commit) {
      options.commit = (await this.env.shell.output('git', ['rev-parse', 'HEAD'], { cwd: this.project.directory })).trim();
      debug(`Commit hash: ${strong(options.commit)}`);
    }

    let build = await this.createDeployBuild(appflowId, token, options);
    const buildId = build.job_id;

    const details = columnar([
      ['App ID', strong(appflowId)],
      ['Build ID', strong(buildId.toString())],
      ['Commit', strong(`${build.commit.sha.substring(0, 6)} ${build.commit.note}`)],
      ['Environment', build.environment_name ? strong(build.environment_name) : weak('not set')],
      ['Channels', build.pending_channels.length ? build.pending_channels.map(v => strong(`"${v}"`)).join(', ') : weak('not set')],
    ], { vsep: ':' });

    this.env.log.ok(
      `Build created\n` +
      details + '\n\n'
    );

    build = await this.tailBuildLog(appflowId, buildId, token);
    if (build.state !== 'success') {
      throw new Error('Build failed');
    }

  }

  async createDeployBuild(appflowId: string, token: string, options: CommandLineOptions): Promise<DeployBuild> {
    const { req } = await this.env.client.make('POST', `/apps/${appflowId}/deploys/verbose_post`);

    let channels: string[] = [];
    if (options.channel) {
      if (typeof(options.channel) === 'string') {
        channels.push(String(options.channel));
      } else if (typeof(options.channel) === 'object') {
        channels = channels.concat(options.channel);
      }
    }

    req.set('Authorization', `Bearer ${token}`).send({
      commit_sha: options.commit,
      environment_name: options.environment,
      channel_names: channels ? channels : undefined,
    });

    try {
      const res = await this.env.client.do(req);
      return res.data as DeployBuild;
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
        const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
        throw new FatalException(`Unable to create build: ` + apiErrorMessage);
      } else {
        throw e;
      }
    }
  }

  async tailBuildLog(appflowId: string, buildId: number, token: string): Promise<DeployBuild> {
    let build;
    let start = 0;
    const ws = this.env.log.createWriteStream(LOGGER_LEVELS.INFO, false);

    let isCreatedMessage = false;
    while (!(build && (build.state === 'success' || build.state === 'failed'))) {
      await sleep(5000);
      build = await this.getDeployBuild(appflowId, buildId, token);
      if (build && build.state === 'created' && !isCreatedMessage) {
        ws.write(chalk.yellow('Concurrency limit reached: build will start as soon as other builds finish.'));
        isCreatedMessage = true;
      }
      const trace = build.job.trace;
      if (trace.length > start) {
        ws.write(trace.substring(start));
        start = trace.length;
      }
    }
    ws.end();

    return build;
  }

  async getDeployBuild(appflowId: string, buildId: number, token: string): Promise<DeployBuild> {
    const { req } = await this.env.client.make('GET', `/apps/${appflowId}/deploys/${buildId}`);
    req.set('Authorization', `Bearer ${token}`).send();

    try {
      const res = await this.env.client.do(req);
      return res.data as DeployBuild;
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
        const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
        throw new FatalException(`Unable to get build ${buildId}: ` + apiErrorMessage);
      } else {
        throw e;
      }
    }
  }
}
