import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { validators } from '@ionic/cli-framework';
import { columnar, prettyPath } from '@ionic/cli-framework/utils/format';
import { fsMkdir, fsUnlink, pathExists, removeDirectory } from '@ionic/cli-framework/utils/fs';
import { isValidURL } from '@ionic/cli-framework/utils/string';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun, OptionGroup, ResolvedStarterTemplate, StarterManifest, StarterTemplate, getProject } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { runCommand } from '@ionic/cli-utils/lib/executor';
import { prettyProjectName } from '@ionic/cli-utils/lib/project';
import { emoji } from '@ionic/cli-utils/lib/utils/emoji';

const debug = Debug('ionic:cli:commands:start');

export class StartCommand extends Command implements CommandPreRun {
  canRemoveExisting?: boolean;

  async getMetadata(): Promise<CommandMetadata> {
    const starterTemplates = await this.getStarterTemplates();

    return {
      name: 'start',
      type: 'global',
      description: 'Create a new project',
      longDescription: `
This command creates a working Ionic app. It installs dependencies for you and sets up your project.

${chalk.green('ionic start')} will create a new app from ${chalk.green('template')}. You can list all templates with the ${chalk.green('--list')} option. For more information on starter templates, see the CLI documentation${chalk.cyan('[1]')}.

You can also specify a git repository URL for ${chalk.green('template')} and the existing project will be cloned.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/cli/starters.html')}
      `,
      exampleCommands: [
        '',
        '--list',
        'myApp',
        'myApp blank',
        'myApp tabs --cordova',
        'myApp blank --type=ionic1',
        'myApp super --type=ionic-angular',
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
        },
      ],
      options: [
        {
          name: 'list',
          description: 'List available starter templates',
          type: Boolean,
          aliases: ['l'],
        },
        {
          name: 'type',
          description: `Type of project to start (e.g. ${lodash.uniq(starterTemplates.map(t => t.type)).map(type => chalk.green(type)).join(', ')})`,
          type: String,
        },
        {
          name: 'display-name',
          description: 'Human-friendly name (use quotes around the name)',
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
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'git',
          description: 'Do not initialize a git repo',
          type: Boolean,
          default: true,
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'link',
          description: 'Do not ask to connect the app with the Ionic Dashboard',
          type: Boolean,
          default: true,
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'pro-id',
          description: 'Specify an app ID from the Ionic Dashboard to link',
        },
        {
          name: 'bundle-id',
          description: 'Specify the bundle ID/application ID for your app (reverse-DNS notation)',
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'tag',
          description: `Specify a tag to use for the starters (e.g. ${['latest', 'testing', 'next'].map(t => chalk.green(t)).join(', ')})`,
          default: 'latest',
          groups: [OptionGroup.Hidden],
        },
      ],
    };
  }

  async getStarterTemplates(): Promise<StarterTemplate[]> {
    const { STARTER_TEMPLATES } = await import('@ionic/cli-utils/lib/start');
    const config = await this.env.config.load();

    return STARTER_TEMPLATES.filter(({ type }) => type !== 'angular' || config.features['project-angular']);
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { promptToLogin } = await import('@ionic/cli-utils/lib/session');
    const starterTemplates = await this.getStarterTemplates();
    const config = await this.env.config.load();

    // If the action is list then lets just end here.
    if (options['list']) {
      const headers = ['name', 'project type', 'description'];
      this.env.log.rawmsg(columnar(starterTemplates.map(({ name, type, description }) => [chalk.green(name), chalk.bold(type), description || '']), { headers }));
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

    if (this.env.project.directory) {
      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'You are already in an Ionic project directory. Do you really want to start another project here?',
        default: false,
      });

      if (!confirm) {
        this.env.log.msg('Not starting project within existing project.');
        throw new FatalException();
      }
    }

    if (options['v1'] || options['v2']) {
      const type = options['v1'] ? 'ionic1' : 'ionic-angular';

      throw new FatalException(
        `Sorry! The ${chalk.green('--v1')} and ${chalk.green('--v2')} flags have been removed.\n` +
        `Use the ${chalk.green('--type')} option. (${chalk.green('ionic start --help')})\n\n` +
        `For ${chalk.bold(prettyProjectName(type))} projects, try ${chalk.green('ionic start ' + (inputs.length > 0 ? inputs.join(' ') + ' ' : '') + '--type=' + type)}`
      );
    }

    if (options['app-name']) {
      this.env.log.warn(`The ${chalk.green('--app-name')} option has been deprecated, please use ${chalk.green('--display-name')}.`);
      options['display-name'] = options['app-name'];
    }

    if (options['bundle-id']) {
      this.env.log.msg(`${chalk.green('--bundle-id')} detected, using ${chalk.green('--cordova')}`);
      options['cordova'] = true;
    }

    if (proAppId) {
      if (!(await this.env.session.isLoggedIn())) {
        await promptToLogin(this.env);
      }
    }

    if (!inputs[0]) {
      if (proAppId) {
        const { AppClient } = await import('@ionic/cli-utils/lib/app');
        const token = await this.env.session.getUserToken();
        const appClient = new AppClient({ token, client: this.env.client });
        const app = await appClient.load(proAppId);
        this.env.log.msg(`Using ${chalk.bold(app.slug)} for ${chalk.green('name')}.`);
        inputs[0] = app.slug;
      } else {
        if (this.env.flags.interactive) {
          this.env.log.info(
            `Every great app needs a name! ${emoji('😍', '')}\n` +
            `We will use this name for the project's folder name and package name. You can change this at any time. To bypass this prompt next time, supply ${chalk.green('name')}, the first argument to ${chalk.green('ionic start')}.`
          );
        }

        const name = await this.env.prompt({
          type: 'input',
          name: 'name',
          message: 'Project name:',
          validate: v => validators.required(v),
        });

        inputs[0] = name;
      }
    }

    const projectDir = path.resolve(inputs[0]);
    await this.checkForExisting(inputs[0], projectDir);
    const clonedApp = isValidURL(inputs[1]);

    if (!clonedApp && !options['type']) {
      const recommendedType = config.features['project-angular'] ? 'angular' : 'ionic-angular';

      if (this.env.flags.interactive) {
        this.env.log.info(
          `What type of project would you like to create?\n` +
          `We recommend ${chalk.green(recommendedType)}. To learn more about project types, see the CLI documentation${chalk.cyan('[1]')}. To bypass this prompt next time, supply the ${chalk.green('--type')} option.\n\n` +
          `${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/cli/starters.html')}`
        );
      }

      const type = await this.env.prompt({
        type: 'list',
        name: 'template',
        message: 'Project type:',
        choices: () => {
          const projectTypes = lodash.uniq(starterTemplates.map(t => t.type));
          const cols = columnar(projectTypes.map(type => [`${chalk.green(type)}${type === recommendedType ? ' (recommended)' : ''}`, prettyProjectName(type)])).split('\n');

          return cols.map((col, i) => ({
            name: col,
            short: projectTypes[i],
            value: projectTypes[i],
          }));
        },
      });

      options['type'] = type;
    }

    if (!inputs[1]) {
      if (this.env.flags.interactive) {
        this.env.log.info(
          `Let's pick the perfect starter template! ${emoji('💪', '')}\n` +
          `Starter templates are ready-to-go Ionic apps that come packed with everything you need to build your app. To bypass this prompt next time, supply ${chalk.green('template')}, the second argument to ${chalk.green('ionic start')}.`
        );
      }

      const template = await this.env.prompt({
        type: 'list',
        name: 'template',
        message: 'Starter template:',
        choices: () => {
          const starterTemplateList = starterTemplates.filter(st => st.type === options['type']);
          const cols = columnar(starterTemplateList.map(({ name, description }) => [chalk.green(name), description || ''])).split('\n');

          return cols.map((col, i) => {
            return {
              name: col,
              short: starterTemplateList[i].name,
              value: starterTemplateList[i].name,
            };
          });
        },
      });

      inputs[1] = template;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');
    const { getIonicDevAppText, getIonicProText } = await import('@ionic/cli-utils/lib/start');
    const config = await this.env.config.load();
    const { npmClient } = config;

    const [ name, template ] = inputs;
    const displayName = options['display-name'] ? String(options['display-name']) : name;
    const proAppId = options['pro-id'] ? String(options['pro-id']) : undefined;
    const bundleId = options['bundle-id'] ? String(options['bundle-id']) : undefined;
    const tag = options['tag'] ? String(options['tag']) : 'latest';
    const clonedApp = isValidURL(template);
    let linkConfirmed = typeof proAppId === 'string';

    const gitIntegration = options['git'] ? await this.isGitSetup() : false;

    if (proAppId && !gitIntegration) {
      throw new FatalException(
        `Git CLI not found on your PATH. It must be installed to connect this app to Ionic.\n` +
        `See installation docs for git: ${chalk.bold('https://git-scm.com/book/en/v2/Getting-Started-Installing-Git')}`
      );
    }

    const projectDir = path.resolve(name);

    await this.validateName(name);

    this.env.tasks.next(`Preparing directory ${chalk.green(prettyPath(projectDir))}`);

    if (this.canRemoveExisting) {
      await removeDirectory(projectDir);
    }

    await fsMkdir(projectDir, 0o777);

    if (clonedApp) {
      await this.env.shell.run('git', ['clone', template, name, '--progress'], {});
    } else {
      const starterTemplate = await this.findStarterTemplate(template, String(options['type']), tag);
      await this.downloadStarterTemplate(projectDir, starterTemplate);
    }

    // start is weird, once the project directory is created, it becomes a
    // "project" command and so we replace the `Project` instance that was
    // autogenerated when the CLI booted up. This has worked thus far?
    this.env.project = await getProject(projectDir, this.env);

    const shellOptions = { cwd: projectDir, stdio: ['inherit', 'ignore', 'ignore'] };

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

      if (options['cordova']) {
        await runCommand(runinfo, ['integrations', 'enable', 'cordova', '--quiet']);
      }

      await this.env.project.personalize({ appName: name, bundleId, displayName });
      this.env.log.nl();
    }

    if (options['deps']) {
      this.env.log.msg('Installing dependencies may take several minutes.');

      this.env.log.rawmsg(await getIonicDevAppText());

      const [ installer, ...installerArgs ] = await pkgManagerArgs(npmClient, { command: 'install' });
      await this.env.shell.run(installer, installerArgs, { ...shellOptions, stdio: 'inherit' });
    }

    if (!clonedApp) {
      if (gitIntegration) {
        await this.env.shell.run('git', ['init'], shellOptions); // TODO: use initializeRepo()?
      }

      if (options['link'] && !linkConfirmed) {
        this.env.log.rawmsg(await getIonicProText());

        const confirm = await this.env.prompt({
          type: 'confirm',
          name: 'confirm',
          message: 'Install the free Ionic Pro SDK and connect your app?',
          noninteractiveValue: false,
        });

        if (confirm) {
          linkConfirmed = true;
        }
      }

      if (linkConfirmed) {
        const [ installer, ...installerArgs ] = await pkgManagerArgs(npmClient, { command: 'install', pkg: '@ionic/pro' });
        await this.env.shell.run(installer, installerArgs, shellOptions);

        const cmdArgs = ['link'];

        if (proAppId) {
          cmdArgs.push(proAppId);
        }

        await runCommand(runinfo, cmdArgs);
      }

      const manifestPath = path.resolve(projectDir, 'ionic.starter.json');
      const manifest = await this.loadManifest(manifestPath);

      if (manifest) {
        await fsUnlink(manifestPath);
      }

      if (gitIntegration) {
        await this.env.shell.run('git', ['add', '-A'], shellOptions);
        await this.env.shell.run('git', ['commit', '-m', 'Initial commit', '--no-gpg-sign'], shellOptions);
      }

      if (manifest) {
        await this.performManifestOps(manifest);
      }
    }

    this.env.log.nl();

    await this.showNextSteps(projectDir, linkConfirmed);
  }

  async isGitSetup(): Promise<boolean> {
    const cmdInstalled = await this.env.shell.cmdinfo('git', ['--version']);

    return Boolean(cmdInstalled);
  }

  async checkForExisting(projectName: string, projectDir: string) {
    const projectExists = await pathExists(projectName);

    if (projectExists) {
      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `The directory ${chalk.green(projectName)}/ exists. Would you like to overwrite the directory with this new project?`,
        default: false,
      });

      if (!confirm) {
        this.env.log.msg(`Not erasing existing project in ${chalk.green(prettyPath(projectDir))}.`);
        throw new FatalException();
      }

      this.canRemoveExisting = confirm;
    }

    this.env.tasks.end();
  }

  async findStarterTemplate(template: string, type: string, tag: string): Promise<ResolvedStarterTemplate> {
    const { STARTER_BASE_URL, getStarterList } = await import('@ionic/cli-utils/lib/start');
    const starterTemplates = await this.getStarterTemplates();
    const starterTemplate = starterTemplates.find(t => t.type === type && t.name === template);

    if (starterTemplate) {
      return {
        ...starterTemplate,
        archive: `${STARTER_BASE_URL}/${tag === 'latest' ? '' : `${tag}/`}${starterTemplate.id}.tar.gz`,
      };
    }

    this.env.tasks.next('Looking up starter');
    const starterList = await getStarterList(this.env.config, tag);

    const starter = starterList.starters.find(t => t.type === type && t.name === template);

    if (starter) {
      return {
        ...starter,
        archive: `${STARTER_BASE_URL}/${tag === 'latest' ? '' : `${tag}/`}${starter.id}.tar.gz`,
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
        `Please choose a different name. Alphanumeric characters are always safe for app names. You can use the ${chalk.green('--display-name')} option for the human-friendly name.`
      );
    }
  }

  async loadManifest(manifestPath: string): Promise<StarterManifest | undefined> {
    const { readStarterManifest } = await import('@ionic/cli-utils/lib/start');

    try {
      return await readStarterManifest(manifestPath);
    } catch (e) {
      debug(`Error with manifest file ${chalk.bold(prettyPath(manifestPath))}: ${e}`);
    }
  }

  async performManifestOps(manifest: StarterManifest) {
    if (manifest.welcome) {
      this.env.log.nl();
      this.env.log.msg(`${chalk.bold('Starter Welcome')}:`);
      this.env.log.msg(manifest.welcome);
    }
  }

  async downloadStarterTemplate(projectDir: string, starterTemplate: ResolvedStarterTemplate) {
    const { download } = await import('@ionic/cli-utils/lib/utils/http');
    const { createTarExtraction } = await import('@ionic/cli-utils/lib/utils/archive');

    const task = this.env.tasks.next(`Downloading and extracting ${chalk.green(starterTemplate.name.toString())} starter`);
    const config = await this.env.config.load();
    const ws = await createTarExtraction({ cwd: projectDir, strip: starterTemplate.strip ? 1 : 0 });

    await download(starterTemplate.archive, ws, {
      progress: (loaded, total) => task.progress(loaded, total),
      ssl: config.ssl,
    });

    this.env.tasks.end();
  }

  async showNextSteps(projectDir: string, linkConfirmed: boolean) {
    const steps = [
      `Go to your newly created project: ${chalk.green(`cd ${prettyPath(projectDir)}`)}`,
      `Get Ionic DevApp for easy device testing: ${chalk.bold('https://bit.ly/ionic-dev-app')}`,
    ];

    if (linkConfirmed) {
      steps.push(`Finish setting up Ionic Pro Error Monitoring: ${chalk.bold('https://ionicframework.com/docs/pro/monitoring/#getting-started')}`);
      steps.push(`Finally, push your code to Ionic Pro to perform real-time updates, and more: ${chalk.green('git push ionic master')}`);
    }

    this.env.log.info(`${chalk.bold('Next Steps')}:\n${steps.map(s => `- ${s}`).join('\n')}`);
  }
}
