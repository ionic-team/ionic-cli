import * as path from 'path';

import chalk from 'chalk';

import { validators } from '@ionic/cli-framework/lib';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { fsMkdir, fsUnlink, pathExists, removeDirectory } from '@ionic/cli-framework/utils/fs';
import { isValidURL } from '@ionic/cli-framework/utils/string';

import { BACKEND_LEGACY, BACKEND_PRO, CommandData, CommandLineInputs, CommandLineOptions, CommandPreRun, StarterManifest, StarterTemplate } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { PROJECT_FILE, Project } from '@ionic/cli-utils/lib/project';
import { emoji } from '@ionic/cli-utils/lib/utils/emoji';

export class StartCommand extends Command implements CommandPreRun {
  metadata: CommandData = {
    name: 'start',
    type: 'global',
    description: 'Create a new project',
    longDescription: `
This command creates a working Ionic app. It installs dependencies for you and sets up your project.

${chalk.green('ionic start')} will create a new app from ${chalk.green('template')}. You can list all templates with the ${chalk.green('--list')} option. For more information on starter templates, see the CLI documentation${chalk.cyan('[1]')}.

You can also specify a git repository URL for ${chalk.green('template')} and your existing project will be cloned.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/cli/starters.html')}
    `,
    exampleCommands: [
      '',
      '--list',
      'myApp blank',
      'myApp tabs --cordova',
      'myApp blank --type=ionic1',
      'myConferenceApp https://github.com/ionic-team/ionic-conference-app',
    ],
    inputs: [
      {
        name: 'name',
        description: 'The name of your project directory',
        validators: [validators.required],
      },
      {
        name: 'template',
        description: `The starter template to use (e.g. ${['blank', 'tabs'].map(t => chalk.green(t)).join(', ')}; use ${chalk.green('--list')} to see all)`,
        validators: [validators.required],
      }
    ],
    options: [
      {
        name: 'list',
        description: 'List starter templates available',
        type: Boolean,
        aliases: ['l'],
      },
      {
        name: 'type',
        description: `Type of project to start (e.g. ${chalk.green('ionic-angular')}, ${chalk.green('ionic1')})`,
        type: String,
        default: 'ionic-angular',
      },
      {
        name: 'display-name',
        description: 'Human-readable name (use quotes around the name)',
        type: String,
        aliases: ['n'],
      },
      {
        name: 'cordova',
        description: 'Include Cordova integration',
        type: Boolean,
      },
      {
        name: 'deps',
        description: 'Do not install npm/yarn dependencies',
        type: Boolean,
        default: true,
        advanced: true,
      },
      {
        name: 'git',
        description: 'Do not initialize a git repo',
        type: Boolean,
        default: true,
        advanced: true,
      },
      {
        name: 'link',
        description: 'Do not ask to connect the app with the Ionic Dashboard',
        type: Boolean,
        default: true,
        advanced: true,
      },
      {
        name: 'pro-id',
        description: 'Specify an app ID from the Ionic Dashboard to link',
      },
      {
        name: 'bundle-id',
        description: 'Specify the bundle ID/application ID for your app (reverse-DNS notation)',
        advanced: true,
      },
    ],
  };

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { STARTER_TEMPLATES, getStarterTemplateTextList } = await import('@ionic/cli-utils/lib/start');
    const { promptToLogin } = await import('@ionic/cli-utils/lib/session');

    // If the action is list then lets just end here.
    if (options['list']) {
      this.env.log.msg(getStarterTemplateTextList(STARTER_TEMPLATES).join('\n'));
      throw new FatalException('', 0);
    }

    if (options['skip-deps']) {
      this.env.log.warn(`The ${chalk.green('--skip-deps')} option has been deprecated. Please use ${chalk.green('--no-deps')}.`);
      options['deps'] = false;
    }

    if (options['skip-link']) {
      this.env.log.warn(`The ${chalk.green('--skip-link')} option has been deprecated. Please use ${chalk.green('--no-link')}.`);
      options['link'] = false;
    }


    if (options['pro-id']) {
      if (options['link'] === false) {
        this.env.log.warn(`The ${chalk.green('--no-link')} option has no effect with ${chalk.green('--pro-id')}.`);
      }

      options['link'] = true;
    }

    const proAppId = options['pro-id'] ? String(options['pro-id']) : undefined;
    const config = await this.env.config.load();

    if (proAppId && config.backend !== BACKEND_PRO) {
      await this.env.runCommand(['config', 'set', '-g', 'backend', 'pro'], {});
      this.env.log.nl();
      this.env.log.info(
        `${chalk.bold(chalk.blue.underline('Welcome to Ionic Pro!') + ' The CLI is now set up to use Ionic Pro services.')}\n` +
        `You can revert back to Ionic Cloud (legacy) services at any time:\n\n` +
        `${chalk.green('ionic config set -g backend legacy')}\n`
      );
    }

    if (this.env.project.directory) {
      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'You are already in an Ionic project directory. Do you really want to start another project here?',
        default: false,
      });

      if (!confirm) {
        this.env.log.info('Not starting project within existing project.');
        throw new FatalException();
      }
    }

    if (options['v1'] || options['v2']) {
      const type = options['v1'] ? 'ionic1' : 'ionic-angular';

      throw new FatalException(
        `Sorry! The ${chalk.green('--v1')} and ${chalk.green('--v2')} flags have been removed.\n` +
        `Use the ${chalk.green('--type')} option. (${chalk.green('ionic start --help')})\n\n` +
        `For ${chalk.bold(this.env.project.formatType(type))} projects, try ${chalk.green('ionic start ' + (inputs.length > 0 ? inputs.join(' ') + ' ' : '') + '--type=' + type)}`
      );
    }

    if (options['app-name']) {
      this.env.log.warn(`The ${chalk.green('--app-name')} option has been deprecated, please use ${chalk.green('--display-name')}.`);
      options['display-name'] = options['app-name'];
    }

    if (options['bundle-id']) {
      this.env.log.info(`${chalk.green('--bundle-id')} detected, using ${chalk.green('--cordova')}`);
      options['cordova'] = true;
    }

    if (proAppId) {
      if (!(await this.env.session.isLoggedIn())) {
        await promptToLogin(this.env);
      }
    }

    if (!inputs[0]) {
      if (proAppId) {
        const { App } = await import('@ionic/cli-utils/lib/app');
        const token = await this.env.session.getUserToken();
        const appLoader = new App(token, this.env.client);
        const app = await appLoader.load(proAppId);
        this.env.log.info(`Using ${chalk.bold(app.slug)} for ${chalk.green('name')}.`);
        inputs[0] = app.slug;
      } else {
        const name = await this.env.prompt({
          type: 'input',
          name: 'name',
          message: 'What would you like to name your project:',
          validate: v => validators.required(v),
        });

        inputs[0] = name;
      }
    }

    if (!inputs[1]) {
      const template = await this.env.prompt({
        type: 'list',
        name: 'template',
        message: 'What starter would you like to use:',
        choices: () => {
          const starterTemplates = STARTER_TEMPLATES.filter(st => st.type === options['type']);

          return getStarterTemplateTextList(starterTemplates)
            .map((text, i) => {
              return {
                name: text,
                short: starterTemplates[i].name,
                value: starterTemplates[i].name
              };
            });
        }
      });

      inputs[1] = template;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { getHelloText } = await import('@ionic/cli-utils/lib/start');
    const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');

    const [ name, template ] = inputs;
    const displayName = options['display-name'] ? String(options['display-name']) : name;
    const proAppId = options['pro-id'] ? String(options['pro-id']) : undefined;
    const clonedApp = isValidURL(template);
    let linkConfirmed = typeof proAppId === 'string';

    const config = await this.env.config.load();
    const gitIntegration = options['git'] ? await this.isGitSetup() : false;

    if (proAppId && config.backend === BACKEND_PRO && !gitIntegration) {
      throw new FatalException(
        `Git CLI not found on your PATH. It must be installed to connect this app to Ionic.\n` +
        `See installation docs for git: ${chalk.bold('https://git-scm.com/book/en/v2/Getting-Started-Installing-Git')}`
      );
    }

    const projectDir = path.resolve(name);

    await this.validateName(name);
    await this.ensureDirectory(name, projectDir);

    if (clonedApp) {
      await this.env.shell.run('git', ['clone', template, name, '--progress'], { showExecution: true });
    } else {
      const starterTemplate = await this.findStarterTemplate(template, String(options['type']));
      await this.downloadStarterTemplate(projectDir, starterTemplate);
    }

    // start is weird, once the project directory is created, it becomes a
    // "project" command and so we replace the `Project` instance that was
    // autogenerated when the CLI booted up. This has worked thus far?
    this.env.project = new Project(projectDir, PROJECT_FILE);

    const shellOptions = { cwd: projectDir };

    if (!clonedApp) {
      if (!options['cordova']) {
        const confirm = await this.env.prompt({
          type: 'confirm',
          name: 'confirm',
          message: 'Would you like to integrate your new app with Cordova to target native iOS and Android?',
          default: false,
        });

        if (confirm) {
          options['cordova'] = true;
        }
      }

      await this.personalizeApp(projectDir, name, displayName);

      if (options['cordova']) {
        await this.env.runCommand(['integrations', 'enable', 'cordova', '--quiet']);
        const bundleId = options['bundle-id'] ? String(options['bundle-id']) : undefined;
        await this.personalizeCordovaApp(projectDir, name, bundleId);
      }

      this.env.log.nl();
    }

    if (options['deps']) {
      this.env.log.info('Installing dependencies may take several minutes.');

      this.env.log.msg('\n');
      this.env.log.msg(chalk.bold(`  ${emoji('✨', '*')}   IONIC  DEVAPP  ${emoji('✨', '*')}`));

      this.env.log.msg('\n Speed up development with the ' + chalk.bold('Ionic DevApp') +
      ', our fast, on-device testing mobile app\n\n');
      this.env.log.msg(`  -  ${emoji('🔑', '')}   Test on iOS and Android without Native SDKs`);
      this.env.log.msg(`  -  ${emoji('🚀', '')}   LiveReload for instant style and JS updates`);

      this.env.log.msg('\n ️-->    Install DevApp: ' + chalk.bold('https://bit.ly/ionic-dev-app') + '    <--\n\n');

      const [ installer, ...installerArgs ] = await pkgManagerArgs(this.env, { command: 'install' });
      await this.env.shell.run(installer, installerArgs, shellOptions);
    }

    if (!clonedApp) {
      if (gitIntegration) {
        await this.env.shell.run('git', ['init'], { showSpinner: false, ...shellOptions });
      }

      if (config.backend === BACKEND_PRO) {
        if (options['link'] && !linkConfirmed) {
          this.env.log.msg('\n' + chalk.bold(`  ${emoji('🔥', '*')}   IONIC  PRO  ${emoji('🔥', '*')}`));
          this.env.log.msg('\n Supercharge your Ionic development with the ' + chalk.bold('Ionic Pro') + ' SDK\n\n');
          this.env.log.msg(`  -  ${emoji('⚠️', '')}   Track runtime errors in real-time, back to your original TypeScript`);
          this.env.log.msg(`  -  ${emoji('📲', '')}   Push remote updates and skip the app store queue`);
          this.env.log.msg(`\nLearn more about Ionic Pro: ${chalk.bold('https://ionicframework.com/products')}\n`);

          const confirm = await this.env.prompt({
            type: 'confirm',
            name: 'confirm',
            message: 'Install the free Ionic Pro SDK and connect your app?',
            noninteractiveValue: false,
          });
          this.env.log.msg('\n-----------------------------------\n\n');

          if (confirm) {
            linkConfirmed = true;
          }
        }

        if (linkConfirmed) {
          const [ installer, ...installerArgs ] = await pkgManagerArgs(this.env, { pkg: '@ionic/pro' });
          await this.env.shell.run(installer, installerArgs, shellOptions);

          const cmdArgs = ['link'];

          if (proAppId) {
            cmdArgs.push(proAppId);
          }

          await this.env.runCommand(cmdArgs);
        }
      }

      const manifestPath = path.resolve(projectDir, 'ionic.starter.json');
      const manifest = await this.loadManifest(manifestPath);

      if (manifest) {
        await fsUnlink(manifestPath);
      }

      if (gitIntegration) {
        await this.env.shell.run('git', ['add', '-A'], { showSpinner: false, ...shellOptions });
        await this.env.shell.run('git', ['commit', '-m', 'Initial commit', '--no-gpg-sign'], { showSpinner: false, ...shellOptions });
      }

      if (config.backend === BACKEND_LEGACY) {
        this.env.log.info(getHelloText());
      }

      if (manifest) {
        await this.performManifestOps(manifest);
      }
    }

    this.env.log.nl();

    await this.showNextSteps(projectDir, linkConfirmed);
  }

  async isGitSetup(): Promise<boolean> {
    const config = await this.env.config.load();
    const cmdInstalled = await this.env.shell.cmdinfo('git', ['--version']);

    if (cmdInstalled) {
      return true;
    }

    if (config.backend === BACKEND_LEGACY) {
      this.env.log.warn(
        `Git CLI not found on your PATH. You may wish to install it to version control your app.\n` +
        `See installation docs for git: ${chalk.bold('https://git-scm.com/book/en/v2/Getting-Started-Installing-Git')}\n\n` +
        `Use ${chalk.green('--no-git')} to disable this warning.\n`
      );
    }

    return false;
  }

  async ensureDirectory(projectName: string, projectDir: string) {
    const { isSafeToCreateProjectIn } = await import('@ionic/cli-utils/lib/start');

    const projectExists = await pathExists(projectName);

    if (!projectExists) {
      this.env.tasks.next(`Creating directory ${chalk.green(prettyPath(projectDir))}`);
      await fsMkdir(projectDir, 0o777);
    } else if (!(await isSafeToCreateProjectIn(projectDir))) {
      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: (
          `The directory ${chalk.green(projectName)} contains file(s) that could conflict. ` +
          'Would you like to overwrite the directory with this new project?'
        ),
        default: false,
      });

      if (confirm) {
        this.env.tasks.next(`Creating directory ${chalk.green(prettyPath(projectDir))}`);
        await removeDirectory(projectDir);
        await fsMkdir(projectDir, 0o777);
      } else {
        throw new FatalException(`Not erasing existing project in ${chalk.green(prettyPath(projectDir))}.`, 0);
      }
    }

    this.env.tasks.end();
  }

  async findStarterTemplate(template: string, type: string): Promise<StarterTemplate> {
    const { STARTER_BASE_URL, STARTER_TEMPLATES, getStarterList } = await import('@ionic/cli-utils/lib/start');
    const starterTemplate = STARTER_TEMPLATES.find(t => t.type === type && t.name === template);

    if (starterTemplate) {
      return starterTemplate;
    }

    this.env.tasks.next('Looking up starter');
    const starterList = await getStarterList(this.env.config);

    const starter = starterList.starters.find(t => t.type === type && t.name === template);

    if (starter) {
      return {
        strip: false,
        name: starter.name,
        type: starter.type,
        description: '',
        archive: `${STARTER_BASE_URL}/${starter.id}.tar.gz`,
      };
    } else {
      throw new FatalException(
        `Unable to find starter template for ${chalk.green(template)}\n` +
        `If this is not a typo, please make sure it is a valid starter template within the starters repo: ${chalk.bold('https://github.com/ionic-team/starters')}`
      );
    }
  }

  async validateName(name: string) {
    const { isValidPackageName } = await import('@ionic/cli-framework/utils/npm');
    const { isProjectNameValid } = await import('@ionic/cli-utils/lib/start');

    if (!isProjectNameValid(name)) {
      throw new FatalException(`Please name your Ionic project something meaningful other than ${chalk.green(name)}`);
    }

    if (!isValidPackageName(name) || name !== path.basename(name)) {
      throw new FatalException(
        `${chalk.green(name)} is not a valid package or directory name.\n` +
        `Please choose a different name. Alphanumeric characters are always safe for app names. You can use the ${chalk.green('--display-name')} option for the human-readable name.`
      );
    }
  }

  async loadManifest(manifestPath: string): Promise<StarterManifest | undefined> {
    const { readStarterManifest } = await import('@ionic/cli-utils/lib/start');

    try {
      return await readStarterManifest(manifestPath);
    } catch (e) {
      this.env.log.debug(`Error with manifest file ${chalk.bold(prettyPath(manifestPath))}: ${e}`);
    }
  }

  async performManifestOps(manifest: StarterManifest) {
    if (manifest.welcome) {
      this.env.log.nl();
      this.env.log.msg(`${chalk.bold('Starter Welcome')}:\n`);
      this.env.log.info(manifest.welcome);
    }
  }

  async personalizeApp(projectDir: string, name: string, displayName: string) {
    const { updatePackageJsonForCli } = await import('@ionic/cli-utils/lib/start');

    const project = await this.env.project.load();

    this.env.tasks.next(`Personalizing ${chalk.bold('ionic.config.json')} and ${chalk.bold('package.json')}`);

    project.name = displayName;
    await updatePackageJsonForCli(projectDir, name);
    await this.env.project.save();

    this.env.tasks.end();
  }

  async personalizeCordovaApp(projectDir: string, name: string, bundleId?: string) {
    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const conf = await ConfigXml.load(projectDir);
    conf.setName(name);

    if (bundleId) {
      conf.setBundleId(bundleId);
    }

    await conf.save();
  }

  async downloadStarterTemplate(projectDir: string, starterTemplate: StarterTemplate) {
    const { download } = await import('@ionic/cli-utils/lib/http');
    const { createTarExtraction } = await import('@ionic/cli-utils/lib/utils/archive');

    const task = this.env.tasks.next(`Downloading and extracting ${chalk.green(starterTemplate.name.toString())} starter`);
    const ws = await createTarExtraction({ cwd: projectDir, strip: starterTemplate.strip ? 1 : 0 });
    await download(this.env.config, starterTemplate.archive, ws, {
      progress: (loaded, total) => task.progress(loaded, total),
    });

    this.env.tasks.end();
  }

  async showNextSteps(projectDir: string, linkConfirmed: boolean) {
    const config = await this.env.config.load();

    this.env.log.msg(`${chalk.bold('Next Steps')}:\n`);
    this.env.log.msg(`* Go to your newly created project: ${chalk.green(`cd ${prettyPath(projectDir)}`)}`);
    this.env.log.msg(`* Get Ionic DevApp for easy device testing: ${chalk.bold('https://bit.ly/ionic-dev-app')}`);

    if (config.backend === BACKEND_PRO && linkConfirmed) {
      this.env.log.msg(`* Finish setting up Ionic Pro Error Monitoring: ${chalk.bold('https://ionicframework.com/docs/pro/monitoring/#getting-started')}\n`);
      this.env.log.msg(`* Finally, push your code to Ionic Pro to perform real-time updates, and more: ${chalk.green('git push ionic master')}`);
    }

    this.env.log.nl();
  }
}
