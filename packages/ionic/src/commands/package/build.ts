import chalk from 'chalk';

import { contains } from '@ionic/cli-framework/lib';
import { BACKEND_LEGACY, CommandLineInputs, CommandLineOptions, CommandPreRun, PackageBuild } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { APP_SCRIPTS_INTENT, APP_SCRIPTS_OPTIONS } from '@ionic/cli-utils/lib/ionic-angular/app-scripts';
import { FatalException } from '@ionic/cli-utils/lib/errors';

import { DEPRECATION_NOTICE } from './common';

@CommandMetadata({
  name: 'build',
  type: 'project',
  backends: [BACKEND_LEGACY],
  deprecated: true,
  description: 'Start a package build',
  longDescription: `
${chalk.bold.yellow('WARNING')}: ${DEPRECATION_NOTICE}

Ionic Package makes it easy to build a native binary of your app in the cloud.

Full documentation can be found here: ${chalk.bold('https://docs.ionic.io/services/package/')}
  `,
  exampleCommands: ['android', 'ios --profile=dev', 'android --profile=prod --release --prod'],
  inputs: [
    {
      name: 'platform',
      description: `The platform to target: ${chalk.green('ios')}, ${chalk.green('android')}`,
      validators: [contains(['ios', 'android'], {})],
    },
  ],
  options: [
    ...APP_SCRIPTS_OPTIONS,
    {
      name: 'release',
      description: 'Mark as a release build',
      type: Boolean,
    },
    {
      name: 'profile',
      description: 'The security profile to use with this build',
      type: String,
      aliases: ['p'],
    },
    {
      name: 'note',
      description: 'Give the package snapshot a note',
    },
  ],
})
export class PackageBuildCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { PackageClient } = await import('@ionic/cli-utils/lib/package');
    const { SecurityClient } = await import('@ionic/cli-utils/lib/security');

    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);
    const sec = new SecurityClient(token, this.env.client);

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'list',
        name: 'platform',
        message: 'What platform would you like to target:',
        choices: ['ios', 'android'],
      });

      inputs[0] = platform;
    }

    if (!options['profile'] && (inputs[0] === 'ios' || (inputs[0] === 'android' && options['release']))) {
      this.env.tasks.next(`Build requires security profile, but ${chalk.green('--profile')} was not provided. Looking up your profiles`);
      const allProfiles = await sec.getProfiles({});
      this.env.tasks.end();
      const desiredProfileType = options['release'] ? 'production' : 'development';
      const profiles = allProfiles.filter(p => p.type === desiredProfileType);

      if (profiles.length === 0) {
        throw new FatalException(`Sorry--a valid ${chalk.bold(desiredProfileType)} security profile is required for ${pkg.formatPlatform(inputs[0])} ${options['release'] ? 'release' : 'debug'} builds.`);
      }

      if (profiles.length === 1) {
        this.env.log.warn(`Attempting to use ${chalk.bold(profiles[0].tag)} (${chalk.bold(profiles[0].name)}), as it is your only ${chalk.bold(desiredProfileType)} security profile.`);
        options['profile'] = profiles[0].tag;
      } else {
        const profile = await this.env.prompt({
          type: 'list',
          name: 'profile',
          message: 'Please choose a security profile to use with this build',
          choices: profiles.map(p => ({
            name: p.name,
            short: p.name,
            value: p.tag,
          })),
        });

        options['profile'] = profile;
      }
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { upload } = await import('@ionic/cli-utils/lib/upload');
    const { DeployClient } = await import('@ionic/cli-utils/lib/deploy');
    const { PackageClient } = await import('@ionic/cli-utils/lib/package');
    const { SecurityClient } = await import('@ionic/cli-utils/lib/security');
    const { filterOptionsByIntent } = await import('@ionic/cli-utils/lib/utils/command');
    const { createArchive } = await import('@ionic/cli-utils/lib/utils/archive');

    let [ platform ] = <[PackageBuild['platform']]>inputs;
    let { prod, release, profile, note } = options;

    if (typeof note !== 'string') {
      note = 'Ionic Package Upload';
    }

    const project = await this.env.project.load();
    const token = await this.env.session.getAppUserToken();
    const deploy = new DeployClient(token, this.env.client);
    const sec = new SecurityClient(token, this.env.client);
    const pkg = new PackageClient(token, this.env.client);

    if (typeof profile === 'string') {
      this.env.tasks.next(`Retrieving security profile ${chalk.bold(profile)}`);
      const p = await sec.getProfile(profile.toLowerCase()); // TODO: gracefully handle 404
      this.env.tasks.end();

      if (!p.credentials[platform]) {
        throw new FatalException(`Profile ${chalk.bold(p.tag)} (${chalk.bold(p.name)}) was found, but didn't have credentials for ${pkg.formatPlatform(platform)}.`); // TODO: link to docs
      }

      if (release && p.type !== 'production') {
        throw new FatalException(
          `Profile ${chalk.bold(p.tag)} (${chalk.bold(p.name)}) is a ${chalk.bold(p.type)} profile, which won't work for release builds.\n` +
          `Please use a production security profile.`
        ); // TODO: link to docs
      }
    }

    if (project.type === 'ionic-angular' && release && !prod) {
      this.env.log.warn(`We recommend using ${chalk.green('--prod')} for production builds when using ${chalk.green('--release')}.`);
    }

    this.env.tasks.end();

    const { build } = await import('@ionic/cli-utils/commands/build');
    await build(this.env, inputs, filterOptionsByIntent(this.metadata, options, APP_SCRIPTS_INTENT));

    const snapshotRequest = await upload(this.env, { note });

    this.env.tasks.next('Requesting project upload');

    const uploadTask = this.env.tasks.next('Uploading project');
    const proj = await pkg.requestProjectUpload();

    const zip = createArchive('zip');
    zip.file('package.json', {});
    zip.file('config.xml', {});
    zip.directory('resources', <any>{}); // TODO: false doesn't work
    zip.finalize();

    await pkg.uploadProject(proj, zip, { progress: (loaded, total) => {
      uploadTask.progress(loaded, total);
    }});

    this.env.tasks.next('Queuing build');

    const snapshot = await deploy.getSnapshot(snapshotRequest.uuid, {});
    const packageBuild = await pkg.queueBuild({
      platform,
      mode: release ? 'release' : 'debug',
      zipUrl: snapshot.url,
      projectId: proj.id,
      profileTag: typeof profile === 'string' ? profile : undefined,
    });

    this.env.tasks.end();
    this.env.log.ok(`Build ${packageBuild.id} has been submitted!`);
  }
}
