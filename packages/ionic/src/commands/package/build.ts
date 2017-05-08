import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
  DeployClient,
  PackageBuild,
  PackageClient,
  SecurityClient,
  contains,
  createArchive,
  filterOptionsByIntent,
  validators,
} from '@ionic/cli-utils';

import { upload } from '../../lib/upload';

@CommandMetadata({
  name: 'build',
  type: 'project',
  description: 'Start a package build',
  inputs: [
    {
      name: 'platform',
      description: `The platform to target: ${chalk.green('ios')}, ${chalk.green('android')}`,
      validators: [validators.required, contains(['ios', 'android'], {})],
      prompt: {
        type: 'list',
        message: 'What platform would you like to target:',
        choices: ['ios', 'android'],
      },
    },
  ],
  options: [
    {
      name: 'prod',
      description: 'Mark this build as a production build',
      type: Boolean,
      intent: 'app-scripts',
    },
    {
      name: 'release',
      description: 'Mark this build as a release build',
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
  exampleCommands: ['android', 'ios --profile dev', 'android --profile prod --release --prod'],
})
export class PackageBuildCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    let [ platform ] = inputs;

    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);
    const sec = new SecurityClient(token, this.env.client);

    if (!options['profile'] && (platform === 'ios' || (platform === 'android' && options['release']))) {
      this.env.tasks.next(`Build requires security profile, but ${chalk.green('--profile')} was not provided. Looking up your profiles`);
      const allProfiles = await sec.getProfiles({});
      this.env.tasks.end();
      const desiredProfileType = options['release'] ? 'production' : 'development';
      const profiles = allProfiles.filter(p => p.type === desiredProfileType);

      if (profiles.length === 0) {
        this.env.log.error(`Sorry--a valid ${chalk.bold(desiredProfileType)} security profile is required for ${pkg.formatPlatform(platform)} ${options['release'] ? 'release' : 'debug'} builds.`);
        return 1;
      }

      if (profiles.length === 1) {
        this.env.log.warn(`Attempting to use ${chalk.bold(profiles[0].tag)} (${chalk.bold(profiles[0].name)}), as it is your only ${chalk.bold(desiredProfileType)} security profile.`);
        options['profile'] = profiles[0].tag;
      } else {
        const response = await this.env.prompt({
          type: 'list',
          name: 'profile',
          message: 'Please choose a security profile to use with this build',
          choices: profiles.map(p => ({
            name: p.name,
            short: p.name,
            value: p.tag,
          })),
        });

        options['profile'] = response['profile'];
      }
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
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
        this.env.log.error(`Profile ${chalk.bold(p.tag)} (${chalk.bold(p.name)}) was found, but didn't have credentials for ${pkg.formatPlatform(platform)}.`); // TODO: link to docs
        return 1;
      }

      if (release && p.type !== 'production') {
        this.env.log.error(`Profile ${chalk.bold(p.tag)} (${chalk.bold(p.name)}) is a ${chalk.bold(p.type)} profile, which won't work for release builds.\n` +
                           `Please use a production security profile.`); // TODO: link to docs
        return 1;
      }
    }

    if (project.type === 'ionic-angular' && release && !prod) {
      this.env.log.warn(`We recommend using ${chalk.green('--prod')} for production builds when using ${chalk.green('--release')}.`);
    }

    this.env.tasks.end();

    await this.env.hooks.fire('command:build', {
      env: this.env,
      inputs,
      options: filterOptionsByIntent(this.metadata, options, 'app-scripts'),
    });

    const snapshotRequest = await upload(this.env, { note });

    this.env.tasks.next('Requesting project upload');

    const uploadTask = this.env.tasks.next('Uploading project');
    const proj = await pkg.requestProjectUpload();

    const zip = createArchive('zip');
    zip.file('package.json');
    zip.file('config.xml');
    zip.directory('resources');
    zip.finalize();

    await pkg.uploadProject(proj, zip, { progress: (loaded, total) => {
      uploadTask.progress(loaded, total);
    }});

    this.env.tasks.next('Queuing build');

    const snapshot = await deploy.getSnapshot(snapshotRequest.uuid, {});
    const build = await pkg.queueBuild({
      platform,
      mode: release ? 'release' : 'debug',
      zipUrl: snapshot.url,
      projectId: proj.id,
      profileTag: typeof profile === 'string' ? profile : undefined,
    });

    this.env.tasks.end();
    this.env.log.ok(`Build ${build.id} has been submitted!`);
  }
}
