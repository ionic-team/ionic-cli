import { OptionGroup, validators } from '@ionic/cli-framework';
import { columnar, prettyPath } from '@ionic/cli-framework/utils/format';
import { isValidURL, slugify } from '@ionic/cli-framework/utils/string';
import { mkdir, pathExists, removeDirectory, unlink } from '@ionic/utils-fs';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

import { PROJECT_FILE } from '../constants';
import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun, IProject, ProjectType, ResolvedStarterTemplate, StarterManifest, StarterTemplate } from '../definitions';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';
import { runCommand } from '../lib/executor';
import { createProjectFromDetails, createProjectFromDirectory, isValidProjectId } from '../lib/project';
import { prependNodeModulesBinToPath } from '../lib/shell';
import { emoji } from '../lib/utils/emoji';

const debug = Debug('ionic:commands:start');

interface CommonAppSchema {
  projectId: string;
  projectDir: string;
  packageId?: string;
  proId?: string;
}

interface NewAppSchema extends CommonAppSchema {
  cloned: false;
  name: string;
  type: ProjectType;
  template: string;
}

interface ClonedAppSchema extends CommonAppSchema {
  cloned: true;
  url: string;
}

export class StartCommand extends Command implements CommandPreRun {
  private canRemoveExisting = false;

  private schema?: NewAppSchema | ClonedAppSchema;

  async getMetadata(): Promise<CommandMetadata> {
    const starterTemplates = await this.getStarterTemplates();

    return {
      name: 'start',
      type: 'global',
      summary: 'Create a new project',
      description: `
This command creates a working Ionic app. It installs dependencies for you and sets up your project.

Running ${chalk.green('ionic start')} without any arguments will prompt you for information about your new project.

The first argument is your app's ${chalk.green('name')}. Don't worry--you can always change this later. The ${chalk.green('--project-id')} is generated from ${chalk.green('name')} unless explicitly specified.

The second argument is the ${chalk.green('template')} from which to generate your app. You can list all templates with the ${chalk.green('--list')} option. For more information on starter templates, see the CLI documentation${chalk.cyan('[1]')}. You can also specify a git repository URL for ${chalk.green('template')}, in which case the existing project will be cloned.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/cli/starters.html')}
      `,
      exampleCommands: [
        '',
        '--list',
        'myApp',
        'myApp blank',
        'myApp tabs --cordova',
        'myApp tabs --capacitor',
        'myApp super --type=angular',
        'myApp blank --type=ionic1',
        'cordovaApp tabs --cordova',
        '"My App" blank',
        '"Conference App" https://github.com/ionic-team/ionic-conference-app',
      ],
      inputs: [
        {
          name: 'name',
          summary: `The name of your new project (e.g. ${chalk.green('myApp')}, ${chalk.green('"My App"')})`,
          validators: [validators.required],
        },
        {
          name: 'template',
          summary: `The starter template to use (e.g. ${['blank', 'tabs'].map(t => chalk.green(t)).join(', ')}; use ${chalk.green('--list')} to see all)`,
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'list',
          summary: 'List available starter templates',
          type: Boolean,
          aliases: ['l'],
        },
        {
          name: 'type',
          summary: `Type of project to start (e.g. ${lodash.uniq(starterTemplates.map(t => t.type)).map(type => chalk.green(type)).join(', ')})`,
          type: String,
        },
        {
          name: 'cordova',
          summary: 'Include Cordova integration',
          type: Boolean,
        },
        {
          name: 'capacitor',
          summary: 'Include Capacitor integration',
          type: Boolean,
          groups: [OptionGroup.Experimental],
        },
        {
          name: 'deps',
          summary: 'Do not install npm/yarn dependencies',
          type: Boolean,
          default: true,
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'git',
          summary: 'Do not initialize a git repo',
          type: Boolean,
          default: true,
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'link',
          summary: 'Do not ask to connect the app to Ionic Pro',
          type: Boolean,
          default: true,
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'pro-id',
          summary: 'Specify an Ionic Pro ID to link',
        },
        {
          name: 'project-id',
          summary: 'Specify a slug for your app (used for the directory name and npm/yarn package name)',
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'package-id',
          summary: 'Specify the bundle ID/application ID for your app (reverse-DNS notation)',
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'tag',
          summary: `Specify a tag to use for the starters (e.g. ${['latest', 'testing', 'next'].map(t => chalk.green(t)).join(', ')})`,
          default: 'latest',
          groups: [OptionGroup.Hidden],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { promptToLogin } = await import('../lib/session');

    const starterTemplates = await this.getStarterTemplates();
    const cloned = isValidURL(inputs[1]);

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
      if (!options['link']) {
        this.env.log.warn(`The ${chalk.green('--no-link')} option has no effect with ${chalk.green('--pro-id')}. App must be linked.`);
      }

      options['link'] = true;

      if (!options['git']) {
        this.env.log.warn(`The ${chalk.green('--no-git')} option has no effect with ${chalk.green('--pro-id')}. Git must be used.`);
      }

      options['git'] = true;
    }

    if (cloned) {
      if (!options['git']) {
        this.env.log.warn(`The ${chalk.green('--no-git')} option has no effect when cloning apps. Git must be used.`);
      }

      options['git'] = true;
    }

    if (this.project && this.project.details.context === 'app') {
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

    if (!options['type']) {
      if (this.env.flags.interactive) {
        this.env.log.info(
          `You are about to create an Ionic 3 app. Would you like to try Ionic 4 ${chalk.red.bold('(beta)')}?\n` +
          `Ionic 4 uses the power of the modern Web and embraces the Angular CLI and Angular Router to bring you the best version of Ionic ever. See our blog announcement${chalk.cyan('[1]')} and documentation${chalk.cyan('[2]')} for more information. We'd love to hear your feedback on our latest version!\n\n` +
          `${chalk.cyan('[1]')}: ${chalk.bold('https://blog.ionicframework.com/announcing-ionic-4-beta/')}\n` +
          `${chalk.cyan('[2]')}: ${chalk.bold('https://beta.ionicframework.com/docs/')}\n`
        );
      }

      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Try Ionic 4?',
        default: false,
      });

      if (confirm) {
        options['type'] = 'angular';
      }
    }

    const projectType = options['type'] ? String(options['type']) : 'ionic-angular';
    const proId = options['pro-id'] ? String(options['pro-id']) : undefined;

    await this.validateProjectType(projectType);

    if (options['v1'] || options['v2']) {
      throw new FatalException(
        `The ${chalk.green('--v1')} and ${chalk.green('--v2')} flags have been removed.\n` +
        `Use the ${chalk.green('--type')} option. (see ${chalk.green('ionic start --help')})`
      );
    }

    if (options['app-name']) {
      this.env.log.warn(`The ${chalk.green('--app-name')} option has been removed. Use the ${chalk.green('name')} argument with double quotes: e.g. ${chalk.green('ionic start "My App"')}`);
    }

    if (options['display-name']) {
      this.env.log.warn(`The ${chalk.green('--display-name')} option has been removed. Use the ${chalk.green('name')} argument with double quotes: e.g. ${chalk.green('ionic start "My App"')}`);
    }

    if (options['bundle-id']) {
      this.env.log.warn(`The ${chalk.green('--bundle-id')} option has been deprecated. Please use ${chalk.green('--package-id')}.`);
      options['package-id'] = options['bundle-id'];
    }

    if (proId) {
      if (!this.env.session.isLoggedIn()) {
        await promptToLogin(this.env);
      }
    }

    if (!inputs[0]) {
      if (proId) {
        const { AppClient } = await import('../lib/app');
        const token = this.env.session.getUserToken();
        const appClient = new AppClient({ token, client: this.env.client });
        const tasks = this.createTaskChain();
        tasks.next(`Looking up app ${chalk.green(proId)}`);
        const app = await appClient.load(proId);
        // TODO: can ask to clone via repo_url
        tasks.end();
        this.env.log.info(`Using ${chalk.bold(app.name)} for ${chalk.green('name')} and ${chalk.bold(app.slug)} for ${chalk.green('--project-id')}.`);
        inputs[0] = app.name;
        options['project-id'] = app.slug;
      } else {
        if (this.env.flags.interactive) {
          this.env.log.nl();
          this.env.log.msg(
            `${chalk.bold(`Every great app needs a name! ${emoji('😍', '')}`)}\n` +
            `Please enter the full name of your app. You can change this at any time. To bypass this prompt next time, supply ${chalk.green('name')}, the first argument to ${chalk.green('ionic start')}.\n\n`
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

    let projectId = options['project-id'] ? String(options['project-id']) : undefined;

    if (projectId) {
      await this.validateProjectId(projectId);
    } else {
      projectId = options['project-id'] = isValidProjectId(inputs[0]) ? inputs[0] : slugify(inputs[0]);
    }

    const projectDir = path.resolve(projectId);
    const packageId = options['package-id'] ? String(options['package-id']) : undefined;

    if (projectId) {
      await this.checkForExisting(projectDir);
    }

    if (cloned) {
      this.schema = {
        cloned,
        url: inputs[1],
        projectId,
        projectDir,
      };
    } else {
      if (!inputs[1]) {
        if (this.env.flags.interactive) {
          this.env.log.nl();
          this.env.log.msg(
            `${chalk.bold(`Let's pick the perfect starter template! ${emoji('💪', '')}`)}\n` +
            `Starter templates are ready-to-go Ionic apps that come packed with everything you need to build your app. To bypass this prompt next time, supply ${chalk.green('template')}, the second argument to ${chalk.green('ionic start')}.\n\n`
          );
        }

        const template = await this.env.prompt({
          type: 'list',
          name: 'template',
          message: 'Starter template:',
          choices: () => {
            const starterTemplateList = starterTemplates.filter(st => st.type === projectType);
            const cols = columnar(starterTemplateList.map(({ name, description }) => [chalk.green(name), description || '']), {}).split('\n');

            if (starterTemplateList.length === 0) {
              throw new FatalException(`No starter templates found for project type: ${chalk.green(projectType)}.`);
            }

            return starterTemplateList.map((starterTemplate, i) => {
              return {
                name: cols[i],
                short: starterTemplate.name,
                value: starterTemplate.name,
              };
            });
          },
        });

        inputs[1] = template;
      }

      this.schema = {
        cloned,
        name: inputs[0],
        type: projectType as ProjectType,
        template: inputs[1],
        projectId,
        projectDir,
        packageId,
        proId,
      };
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const { pkgManagerArgs } = await import('../lib/utils/npm');
    const { getTopLevel, isGitInstalled } = await import('../lib/git');
    const { getIonicDevAppText, getIonicProText } = await import('../lib/start');

    if (!this.schema) {
      throw new FatalException(`Invalid information: cannot start app.`);
    }

    const { projectId, projectDir, packageId, proId } = this.schema;

    const tag = options['tag'] ? String(options['tag']) : 'latest';
    let linkConfirmed = typeof proId === 'string';

    const gitDesired = options['git'] ? true : false;
    const gitInstalled = await isGitInstalled(this.env);
    const gitTopLevel = await getTopLevel(this.env);

    let gitIntegration = gitDesired && gitInstalled && !gitTopLevel ? true : false;

    if (!gitInstalled) {
      const installationDocs = `See installation docs for git: ${chalk.bold('https://git-scm.com/book/en/v2/Getting-Started-Installing-Git')}`;

      if (proId) {
        throw new FatalException(
          `Git CLI not found on your PATH.\n` +
          `Git must be installed to connect this app to Ionic. ${installationDocs}`
        );
      }

      if (this.schema.cloned) {
        throw new FatalException(
          `Git CLI not found on your PATH.\n` +
          `Git must be installed to clone apps with ${chalk.green('ionic start')}. ${installationDocs}`
        );
      }
    }

    if (gitTopLevel && !this.schema.cloned) {
      this.env.log.info(`Existing git project found (${chalk.bold(gitTopLevel)}). Git operations are disabled.`);
    }

    const tasks = this.createTaskChain();
    tasks.next(`Preparing directory ${chalk.green(prettyPath(projectDir))}`);

    if (this.canRemoveExisting) {
      await removeDirectory(projectDir);
    }

    await mkdir(projectDir, 0o777);

    tasks.end();

    if (this.schema.cloned) {
      await this.env.shell.run('git', ['clone', this.schema.url, projectDir, '--progress'], { stdio: 'inherit' });
    } else {
      const starterTemplate = await this.findStarterTemplate(this.schema.template, this.schema.type, tag);
      await this.downloadStarterTemplate(projectDir, starterTemplate);
    }

    let project: IProject | undefined;

    if (this.project && this.project.details.context === 'multiapp' && !this.schema.cloned) {
      // We're in a multi-app setup, so the new config file isn't wanted.
      await unlink(path.resolve(projectDir, 'ionic.config.json'));

      project = await createProjectFromDetails({ context: 'multiapp', configPath: path.resolve(this.project.rootDirectory, PROJECT_FILE), id: projectId, type: this.schema.type, errors: [] }, this.env);
      project.config.set('type', this.schema.type);
      project.config.set('root', path.relative(this.project.rootDirectory, projectDir));
    } else {
      project = await createProjectFromDirectory(projectDir, { _: [] }, this.env, { logErrors: false });
    }

    // start is weird, once the project directory is created, it becomes a
    // "project" command and so we replace the `Project` instance that was
    // autogenerated when the CLI booted up. This has worked thus far?
    this.namespace.root.project = project;

    if (!this.project) {
      throw new FatalException('Error while loading project.');
    }

    this.env.shell.alterPath = p => prependNodeModulesBinToPath(projectDir, p);

    if (!this.schema.cloned) {
      if (typeof options['cordova'] === 'undefined' && !options['capacitor']) {
        const confirm = await this.env.prompt({
          type: 'confirm',
          name: 'confirm',
          message: 'Integrate your new app with Cordova to target native iOS and Android?',
          default: false,
        });

        if (confirm) {
          options['cordova'] = true;
        }
      }

      if (options['cordova']) {
        await runCommand(runinfo, ['integrations', 'enable', 'cordova', '--quiet']);
      }

      if (options['capacitor']) {
        await runCommand(runinfo, ['integrations', 'enable', 'capacitor', '--quiet', '--', this.schema.name, packageId ? packageId : 'io.ionic.starter']);
      }

      await this.project.personalize({ name: this.schema.name, projectId, packageId });

      this.env.log.nl();
    }

    const shellOptions = { cwd: projectDir, stdio: 'inherit' };

    if (options['deps']) {
      this.env.log.msg('Installing dependencies may take several minutes.');
      this.env.log.rawmsg(await getIonicDevAppText());

      const [ installer, ...installerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install' });
      await this.env.shell.run(installer, installerArgs, shellOptions);
    }

    if (!this.schema.cloned) {
      if (gitIntegration) {
        try {
          await this.env.shell.run('git', ['init'], shellOptions); // TODO: use initializeRepo()?
        } catch (e) {
          this.env.log.warn('Error encountered during repo initialization. Disabling further git operations.');
          gitIntegration = false;
        }
      }

      if (options['link'] && !linkConfirmed) {
        this.env.log.rawmsg(await getIonicProText());

        const confirm = await this.env.prompt({
          type: 'confirm',
          name: 'confirm',
          message: 'Install the free Ionic Pro SDK and connect your app?',
          fallback: false,
          default: true,
        });

        if (confirm) {
          linkConfirmed = true;
        }
      }

      if (linkConfirmed) {
        const [ installer, ...installerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg: '@ionic/pro' });
        await this.env.shell.run(installer, installerArgs, shellOptions);

        const cmdArgs = ['link'];

        if (proId) {
          cmdArgs.push(proId);
        }

        cmdArgs.push('--name', this.schema.name);

        await runCommand(runinfo, cmdArgs);
      }

      const manifestPath = path.resolve(projectDir, 'ionic.starter.json');
      const manifest = await this.loadManifest(manifestPath);

      if (manifest) {
        await unlink(manifestPath);
      }

      if (gitIntegration) {
        try {
          await this.env.shell.run('git', ['add', '-A'], shellOptions);
          await this.env.shell.run('git', ['commit', '-m', 'Initial commit', '--no-gpg-sign'], shellOptions);
        } catch (e) {
          this.env.log.warn('Error encountered during commit. Disabling further git operations.');
          gitIntegration = false;
        }
      }

      if (manifest) {
        await this.performManifestOps(manifest);
      }
    }

    this.env.log.nl();

    await this.showNextSteps(projectDir, this.schema.cloned, linkConfirmed);
  }

  async getStarterTemplates(): Promise<StarterTemplate[]> {
    const { STARTER_TEMPLATES } = await import('../lib/start');

    return STARTER_TEMPLATES;
  }

  async getStarterProjectTypes(): Promise<string[]> {
    const starterTemplates = await this.getStarterTemplates();
    return lodash.uniq(starterTemplates.map(t => t.type));
  }

  async checkForExisting(projectDir: string) {
    const projectExists = await pathExists(projectDir);

    if (projectExists) {
      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `${chalk.green(prettyPath(projectDir))} exists. ${chalk.red('Overwrite?')}`,
        default: false,
      });

      if (!confirm) {
        this.env.log.msg(`Not erasing existing project in ${chalk.green(prettyPath(projectDir))}.`);
        throw new FatalException();
      }

      this.canRemoveExisting = confirm;
    }
  }

  async findStarterTemplate(template: string, type: string, tag: string): Promise<ResolvedStarterTemplate> {
    const { STARTER_BASE_URL, getStarterList } = await import('../lib/start');
    const starterTemplates = await this.getStarterTemplates();
    const starterTemplate = starterTemplates.find(t => t.type === type && t.name === template);

    if (starterTemplate) {
      return {
        ...starterTemplate,
        archive: `${STARTER_BASE_URL}/${tag === 'latest' ? '' : `${tag}/`}${starterTemplate.id}.tar.gz`,
      };
    }

    const tasks = this.createTaskChain();
    tasks.next('Looking up starter');
    const starterList = await getStarterList(this.env.config, tag);

    const starter = starterList.starters.find(t => t.type === type && t.name === template);

    if (starter) {
      tasks.end();

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

  async validateProjectType(type: string) {
    const projectTypes = await this.getStarterProjectTypes();

    if (!projectTypes.includes(type)) {
      throw new FatalException(
        `${chalk.green(type)} is not a valid project type.\n` +
        `Please choose a different ${chalk.green('--type')}. Use ${chalk.green('ionic start --list')} to list all available starter templates.`
      );
    }
  }

  async validateProjectId(projectId: string) {
    if (!isValidProjectId(projectId)) {
      throw new FatalException(
        `${chalk.green(projectId)} is not a valid package or directory name.\n` +
        `Please choose a different ${chalk.green('--project-id')}. Alphanumeric characters are always safe.`
      );
    }
  }

  async loadManifest(manifestPath: string): Promise<StarterManifest | undefined> {
    const { readStarterManifest } = await import('../lib/start');

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
    const { createRequest, download } = await import('../lib/utils/http');
    const { tar } = await import('../lib/utils/archive');

    const tasks = this.createTaskChain();
    const task = tasks.next(`Downloading and extracting ${chalk.green(starterTemplate.name.toString())} starter`);
    debug('Tar extraction created for %s', projectDir);
    const ws = tar.extract({ cwd: projectDir });

    const { req } = await createRequest('GET', starterTemplate.archive, this.env.config.getHTTPConfig());
    await download(req, ws, { progress: (loaded, total) => task.progress(loaded, total) });

    tasks.end();
  }

  async showNextSteps(projectDir: string, cloned: boolean, linkConfirmed: boolean) {
    const steps = [
      `Go to your ${cloned ? 'cloned' : 'newly created'} project: ${chalk.green(`cd ${prettyPath(projectDir)}`)}`,
      `Get Ionic DevApp for easy device testing: ${chalk.bold('https://bit.ly/ionic-dev-app')}`,
    ];

    if (linkConfirmed) {
      steps.push(`Finish setting up Ionic Pro Error Monitoring: ${chalk.bold('https://ionicframework.com/docs/pro/monitoring/#getting-started')}`);
      steps.push(`Finally, push your code to Ionic Pro to perform real-time updates, and more: ${chalk.green('git push ionic master')}`);
    }

    this.env.log.info(`${chalk.bold('Next Steps')}:\n${steps.map(s => `- ${s}`).join('\n')}`);
  }
}
