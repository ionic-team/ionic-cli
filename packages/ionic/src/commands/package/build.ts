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
      description: `The platform to target: ${chalk.bold('ios')}, ${chalk.bold('android')}`,
      validators: [validators.required, contains('ios', 'android')],
      prompt: {
        type: 'list',
        message: 'What platform would you like to target:',
        choices: ['ios', 'android'],
      },
    },
  ],
  options: [
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
  exampleCommands: [''],
})
export class PackageBuildCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    let [ platform ] = inputs;
    let { release, profile } = options;

    const token = await this.env.session.getAppUserToken();
    const pkg = new PackageClient(token, this.env.client);

    if (!profile && (platform === 'ios' || (platform === 'android' && release))) {
      this.env.log.error(`${chalk.bold('--profile')} is required for ${pkg.formatPlatform(platform) + (release ? ' release' : '')} builds!`);
      return 1;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    let [ platform ] = <[PackageBuild['platform']]>inputs;
    let { release, profile, note } = options;

    if (typeof note !== 'string') {
      note = 'Ionic Package Upload';
    }

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

    this.env.tasks.end();
    const snapshotRequest = await upload(this.env, { note });

    this.env.tasks.next('Requesting project upload');

    const uploadTask = this.env.tasks.next('Uploading project');
    const project = await pkg.requestProjectUpload();

    const zip = createArchive('zip');
    zip.file('package.json');
    zip.file('config.xml');
    zip.directory('resources');
    zip.finalize();

    await pkg.uploadProject(project, zip, { progress: (loaded, total) => {
      uploadTask.progress(loaded, total);
    }});

    this.env.tasks.next('Queuing build');

    const snapshot = await deploy.getSnapshot(snapshotRequest.uuid, {});
    const build = await pkg.queueBuild({
      platform,
      mode: release ? 'release' : 'debug',
      zipUrl: snapshot.url,
      projectId: project.id,
      profileTag: typeof profile === 'string' ? profile : undefined,
    });

    this.env.tasks.end();
    this.env.log.ok(`Build ${build.id} has been submitted!`);
  }
}
