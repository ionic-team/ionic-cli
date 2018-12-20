import {
  CommandLineInputs,
  CommandLineOptions,
  LOGGER_LEVELS,
  OptionGroup,
  contains,
  validators
} from '@ionic/cli-framework';
import { columnar } from '@ionic/cli-framework/utils/format';
import { sleep } from '@ionic/cli-framework/utils/process';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as fs from 'fs';
import * as https from 'https';

import { CommandMetadata } from '../../definitions';
import { isSuperAgentError } from '../../guards';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

const debug = Debug('ionic:commands:appflow:package');
const PLATFORMS = ['android', 'ios'];
const BUILD_TYPES = ['debug', 'release', 'development', 'ad-hoc', 'app-store', 'enterprise'];

interface PackageBuild {
  job_id: number;
  id: string;
  caller_id: number;
  platform: string;
  build_type: string;
  created: string;
  finished: string;
  state: string;
  commit: any;
  stack: any;
  profile_tag: string;
  automation_id: number;
  environment_id: number;
  native_config_id: number;
  automation_name: string;
  environment_name: string;
  native_config_name: string;
  job: any;
}

interface DownloadUrl {
  url: string | null;
}

export class PackageCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'package',
      type: 'project',
      summary: 'TODO',
      inputs: [
        {
          name: 'platform',
          summary: `The platform to package (${PLATFORMS.map(v => chalk.green(v)).join(', ')})`,
          validators: [validators.required, contains(PLATFORMS, {})],
        },
        {
          name: 'type',
          summary: `The build type (${BUILD_TYPES.map(v => chalk.green(v)).join(', ')})`,
          validators: [validators.required, contains(BUILD_TYPES, {})],
        },
      ],
      options: [
        {
          name: 'securityProfile',
          summary: 'Security profile',
          type: String,
          spec: { value: 'name' },
        },
        {
          name: 'environment',
          summary: 'The group of environment variables exposed to your build',
          type: String,
          spec: { value: 'name' },
        },
        {
          name: 'nativeConfig',
          summary: 'The group of native config variables exposed to your build',
          type: String,
          spec: { value: 'name' },
        },
        {
          name: 'commit',
          summary: 'Commit (defaults to HEAD)',
          type: String,
          groups: [OptionGroup.Advanced],
          spec: { value: 'sha1' },
        },
        {
          name: 'targetPlatform',
          summary: 'Target platform',
          type: String,
          groups: [OptionGroup.Advanced],
          spec: { value: 'name' },
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic appflow package')} outside a project directory.`);
    }

    const token = this.env.session.getUserToken();
    const appflowId = await this.project.requireAppflowId();
    const [ platform, buildType ] = inputs;

    if (!options.commit) {
      options.commit = (await this.env.shell.output('git', ['rev-parse', 'HEAD'], { cwd: this.project.directory })).trim();
      debug(`Commit hash: ${chalk.bold(options.commit)}`);
    }

    let build = await this.createPackageBuild(appflowId, token, platform, buildType, options);
    const buildId = build.job_id;

    const details = columnar([
      ['Appflow ID', chalk.bold(appflowId)],
      ['Build ID', chalk.bold(buildId.toString())],
      ['Commit', chalk.bold(`${build.commit.sha.substring(0, 6)} ${build.commit.note}`)],
      ['Target Platform', chalk.bold(build.stack.friendly_name)],
      ['Build Type', chalk.bold(build.build_type)],
      ['Security Profile', build.profile_tag ? chalk.bold(build.profile_tag) : chalk.dim('not set')],
      ['Environment', build.environment_name ? chalk.bold(build.environment_name) : chalk.dim('not set')],
      ['Native Config', build.native_config_name ? chalk.bold(build.native_config_name) : chalk.dim('not set')],
    ], { vsep: ':' });

    this.env.log.ok(
      `Build created\n` +
      details + '\n\n'
    );

    build = await this.tailBuildLog(appflowId, buildId, token);
    if (build.state !== 'success') {
      throw new Error('Build failed');
    }

    const url = await this.getDownloadUrl(appflowId, buildId, token);
    if (!url.url) {
      throw new Error('Missing URL in response');
    }

    const filename = await this.downloadBuild(url.url);
    this.env.log.ok(`Build completed: ${filename}`);
  }

  async createPackageBuild(appflowId: string, token: string, platform: string, buildType: string, options: CommandLineOptions): Promise<PackageBuild> {
    const { req } = await this.env.client.make('POST', `/apps/${appflowId}/packages/verbose_post`);
    req.set('Authorization', `Bearer ${token}`).send({
      platform,
      build_type: buildType,
      commit_sha: options.commit,
      stack_name: options.targetPlatform,
      profile_name: options.securityProfile,
      environment_name: options.environment,
      native_config_name: options.nativeConfig,
    });

    try {
      const res = await this.env.client.do(req);
      return res.data as PackageBuild;
    } catch (e) {
      if (isSuperAgentError(e)) {
        this.env.log.error(`Unable to create build: ` + e.message);
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
      }
      throw e;
    }
  }

  async getPackageBuild(appflowId: string, buildId: number, token: string): Promise<PackageBuild> {
    const { req } = await this.env.client.make('GET', `/apps/${appflowId}/packages/${buildId}`);
    req.set('Authorization', `Bearer ${token}`).send();

    try {
      const res = await this.env.client.do(req);
      return res.data as PackageBuild;
    } catch (e) {
      if (isSuperAgentError(e)) {
        this.env.log.error(`Unable to get build ${buildId}: ` + e.message);
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
      }
      throw e;
    }
  }

  async getDownloadUrl(appflowId: string, buildId: number, token: string): Promise<DownloadUrl> {
    const { req } = await this.env.client.make('GET', `/apps/${appflowId}/packages/${buildId}/download`);
    req.set('Authorization', `Bearer ${token}`).send();

    try {
      const res = await this.env.client.do(req);
      return res.data as DownloadUrl;
    } catch (e) {
      if (isSuperAgentError(e)) {
        this.env.log.error(`Unable to get download URL for build ${buildId}: ` + e.message);
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
      }
      throw e;
    }
  }

  async tailBuildLog(appflowId: string, buildId: number, token: string): Promise<PackageBuild> {
    let build;
    let start = 0;
    const ws = this.env.log.createWriteStream(LOGGER_LEVELS.INFO, false);

    while (!(build && (build.state === 'success' || build.state === 'failed'))) {
      await sleep(5000);
      build = await this.getPackageBuild(appflowId, buildId, token);
      const trace = build.job.trace;
      if (trace.length > start) {
        ws.write(trace.substring(start));
        start = trace.length;
      }
    }
    ws.end();

    return build;
  }

  async downloadBuild(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      https.get(url, res => {
        const contentDisposition = res.headers['content-disposition'];
        const filename = contentDisposition ? contentDisposition.split('=')[1] : 'output.bin';
        const ws = fs.createWriteStream(filename);
        ws.on('error', reject);
        ws.on('finish', () => resolve(filename));
        res.pipe(ws);
      }).on('error', reject);
    });
  }
}
