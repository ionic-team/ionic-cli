import { CommandLineInputs, CommandLineOptions, LOGGER_LEVELS, MetadataGroup, combine, contains, validators } from '@ionic/cli-framework';
import { columnar } from '@ionic/cli-framework/utils/format';
import { tmpfilepath } from '@ionic/utils-fs';
import { sleep } from '@ionic/utils-process';
import * as chalk from 'chalk';
import * as Debug from 'debug';
import * as fs from 'fs';

import { CommandMetadata } from '../../definitions';
import { isSuperAgentError } from '../../guards';
import { input, strong, weak } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';
import { fileUtils } from '../../lib/utils/file';
import { createRequest, download } from '../../lib/utils/http';

const debug = Debug('ionic:commands:package:build');
const PLATFORMS = ['android', 'ios'];

const ANDROID_BUILD_TYPES = ['debug', 'release'];
const IOS_BUILD_TYPES = ['development', 'ad-hoc', 'app-store', 'enterprise'];
const APP_STORE_COMPATIBLE_TYPES = ['release', 'app-store', 'enterprise'];
const BUILD_TYPES = ANDROID_BUILD_TYPES.concat(IOS_BUILD_TYPES);
const TARGET_PLATFORM = ['Android', 'iOS - Xcode 11 (Preferred)', 'iOS - Xcode 10'];

export interface PackageBuild {
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
  distribution_credential_name: string;
  job: any;
  distribution_trace: string;
}

interface DownloadUrl {
  url: string | null;
}

export class BuildCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    const dashUrl = this.env.config.getDashUrl();

    return {
      name: 'build',
      type: 'project',
      summary: 'Create a package build on Appflow',
      description: `
This command creates a package build on Ionic Appflow. While the build is running, it prints the remote build log to the terminal. If the build is successful, it downloads the created app package file in the current directory.

Apart from ${input('--commit')}, every option can be specified using the full name setup within the Dashboard[^dashboard].

The ${input('--security-profile')} option is mandatory for any iOS build but not for Android debug builds.

Customizing the build:
- The ${input('--environment')} and ${input('--native-config')} options can be used to customize the groups of values exposed to the build.
- Override the preferred platform with ${input('--target-platform')}. This is useful for building older iOS apps.

Deploying the build to an App Store:
- The ${input('--destination')} option can be used to deliver the app created by the build to the configured App Store. \
This can be used only together with build type ${input('release')} for Android and build types ${input('app-store')} or ${input('enterprise')} for iOS.
`,
      footnotes: [
        {
          id: 'dashboard',
          url: dashUrl,
        },
      ],
      exampleCommands: [
        'android debug',
        'ios development --security-profile="iOS Security Profile Name"',
        'android debug --environment="My Custom Environment Name"',
        'android debug --native-config="My Custom Native Config Name"',
        'android debug --commit=2345cd3305a1cf94de34e93b73a932f25baac77c',
        'ios development --security-profile="iOS Security Profile Name" --target-platform="iOS - Xcode 9"',
        'ios development --security-profile="iOS Security Profile Name" --build-file-name=my_custom_file_name.ipa',
        'ios app-store --security-profile="iOS Security Profile Name" --destination="Apple App Store Destination"',
      ],
      inputs: [
        {
          name: 'platform',
          summary: `The platform to package (${PLATFORMS.map(v => input(v)).join(', ')})`,
          validators: [validators.required, contains(PLATFORMS, {})],
        },
        {
          name: 'type',
          summary: `The build type (${BUILD_TYPES.map(v => input(v)).join(', ')})`,
          validators: [validators.required, contains(BUILD_TYPES, {})],
        },
      ],
      options: [
        {
          name: 'security-profile',
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
          name: 'native-config',
          summary: 'The group of native config variables exposed to your build',
          type: String,
          spec: { value: 'name' },
        },
        {
          name: 'destination',
          summary: 'The configuration to deploy the build artifact to the app store',
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
        {
          name: 'target-platform',
          summary: `Target platform (${TARGET_PLATFORM.map(v => input(`"${v}"`)).join(', ')})`,
          type: String,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'name' },
        },
        {
          name: 'build-file-name',
          summary: 'The name for the downloaded build file',
          type: String,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'name' },
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!inputs[0]) {
      const platformInput = await this.env.prompt({
        type: 'list',
        name: 'platform',
        choices: PLATFORMS,
        message: `Platform to package:`,
        validate: v => combine(validators.required, contains(PLATFORMS, {}))(v),
      });

      inputs[0] = platformInput;
    }

    const buildTypes = inputs[0] === 'ios' ? IOS_BUILD_TYPES : ANDROID_BUILD_TYPES;

    // validate that the build type is valid for the platform
    let reenterBuilType = false;
    if (inputs[1] && !buildTypes.includes(inputs[1])) {
      reenterBuilType = true;
      this.env.log.nl();
      this.env.log.warn(`Build type ${strong(inputs[1])} incompatible for ${strong(inputs[0])}; please choose a correct one`);
    }

    if (!inputs[1] || reenterBuilType) {
      const typeInput = await this.env.prompt({
        type: 'list',
        name: 'type',
        choices: buildTypes,
        message: `Build type:`,
        validate: v => combine(validators.required, contains(buildTypes, {}))(v),
      });

      inputs[1] = typeInput;
    }

    // the security profile is mandatory for iOS packages, so prompting if it is missing
    if (inputs[0] === 'ios' && !options['security-profile']) {
      if (this.env.flags.interactive) {
        this.env.log.nl();
        this.env.log.warn(`A security profile is mandatory to build an iOS package`);
      }

      const securityProfileOption = await this.env.prompt({
        type: 'input',
        name: 'security-profile',
        message: `Security Profile Name:`,
      });

      options['security-profile'] = securityProfileOption;
    }

    // if destination is present, validate that a proper build type has been been specified
    if (options['destination'] && !APP_STORE_COMPATIBLE_TYPES.includes(inputs[1])) {
      throw new FatalException(`Build with type ${strong(String(inputs[1]))} cannot be deployed to App Store`);
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic package build')} outside a project directory.`);
    }

    const token = await this.env.session.getUserToken();
    const appflowId = await this.project.requireAppflowId();
    const [ platform, buildType ] = inputs;

    if (!options.commit) {
      options.commit = (await this.env.shell.output('git', ['rev-parse', 'HEAD'], { cwd: this.project.directory })).trim();
      debug(`Commit hash: ${strong(options.commit)}`);
    }

    let build = await this.createPackageBuild(appflowId, token, platform, buildType, options);
    const buildId = build.job_id;

    let customBuildFileName = '';
    if (options['build-file-name']) {
      if (typeof (options['build-file-name']) !== 'string' || !fileUtils.isValidFileName(options['build-file-name'])) {
        throw new FatalException(`${strong(String(options['build-file-name']))} is not a valid file name`);
      }
      customBuildFileName = String(options['build-file-name']);
    }

    const details = columnar([
      ['App ID', strong(appflowId)],
      ['Build ID', strong(buildId.toString())],
      ['Commit', strong(`${build.commit.sha.substring(0, 6)} ${build.commit.note}`)],
      ['Target Platform', strong(build.stack.friendly_name)],
      ['Build Type', strong(build.build_type)],
      ['Security Profile', build.profile_tag ? strong(build.profile_tag) : weak('not set')],
      ['Environment', build.environment_name ? strong(build.environment_name) : weak('not set')],
      ['Native Config', build.native_config_name ? strong(build.native_config_name) : weak('not set')],
      ['Destination', build.distribution_credential_name ? strong(build.distribution_credential_name) : weak('not set')],
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

    const filename = await this.downloadBuild(url.url, customBuildFileName);
    this.env.log.ok(`Build completed: ${filename}`);
  }

  async createPackageBuild(appflowId: string, token: string, platform: string, buildType: string, options: CommandLineOptions): Promise<PackageBuild> {
    const { req } = await this.env.client.make('POST', `/apps/${appflowId}/packages/verbose_post`);
    req.set('Authorization', `Bearer ${token}`).send({
      platform,
      build_type: buildType,
      commit_sha: options.commit,
      stack_name: options['target-platform'],
      profile_name: options['security-profile'],
      environment_name: options.environment,
      native_config_name: options['native-config'],
      distribution_credential_name: options.destination,
    });

    try {
      const res = await this.env.client.do(req);
      return res.data as PackageBuild;
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

  async getPackageBuild(appflowId: string, buildId: number, token: string): Promise<PackageBuild> {
    const { req } = await this.env.client.make('GET', `/apps/${appflowId}/packages/${buildId}`);
    req.set('Authorization', `Bearer ${token}`).send();

    try {
      const res = await this.env.client.do(req);
      return res.data as PackageBuild;
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

  async getDownloadUrl(appflowId: string, buildId: number, token: string): Promise<DownloadUrl> {
    const { req } = await this.env.client.make('GET', `/apps/${appflowId}/packages/${buildId}/download`);
    req.set('Authorization', `Bearer ${token}`).send();

    try {
      const res = await this.env.client.do(req);
      return res.data as DownloadUrl;
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
        const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
        throw new FatalException(`Unable to get download URL for build ${buildId}: ` + apiErrorMessage);
      } else {
        throw e;
      }
    }
  }

  async tailBuildLog(appflowId: string, buildId: number, token: string): Promise<PackageBuild> {
    let build;
    let start = 0;
    const ws = this.env.log.createWriteStream(LOGGER_LEVELS.INFO, false);

    let isCreatedMessage = false;
    while (!(build && (build.state === 'success' || build.state === 'failed'))) {
      await sleep(5000);
      build = await this.getPackageBuild(appflowId, buildId, token);
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

  async downloadBuild(url: string, filename: string): Promise<string> {
    const { req } = await createRequest('GET', url, this.env.config.getHTTPConfig());

    if (!filename) {
      req.on('response', res => {
        const contentDisposition = res.header['content-disposition'];
        filename = contentDisposition ? contentDisposition.split('=')[1] : 'output.bin';
      });
    }

    const tmpFile = tmpfilepath('ionic-package-build');
    const ws = fs.createWriteStream(tmpFile);
    await download(req, ws, {});
    fs.renameSync(tmpFile, filename);

    return filename;
  }
}
