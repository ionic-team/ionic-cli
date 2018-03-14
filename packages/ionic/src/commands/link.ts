import chalk from 'chalk';
import * as Debug from 'debug';

import { validators } from '@ionic/cli-framework';

import { App, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun, GithubBranch, GithubRepo, OptionGroup, PROJECT_FILE, isSuperAgentError } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

const debug = Debug('ionic:cli:commands:link');

const CHOICE_CREATE_NEW_APP = 'createNewApp';
const CHOICE_NEVERMIND = 'nevermind';

const CHOICE_RELINK = 'relink';
const CHOICE_LINK_EXISTING_APP = 'linkExistingApp';

const CHOICE_IONIC = 'ionic';
const CHOICE_GITHUB = 'github';

const CHOICE_MASTER_ONLY = 'master';
const CHOICE_SPECIFIC_BRANCHES = 'specific';

export class LinkCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'link',
      type: 'project',
      description: 'Connect your local app to Ionic Pro',
      longDescription: `
If you have an app on Ionic Pro, you can link it to this local Ionic project with this command.

Excluding the ${chalk.green('app_id')} argument looks up your apps on Ionic Pro and prompts you to select one.

This command simply sets the ${chalk.bold('app_id')} property in ${chalk.bold(PROJECT_FILE)} for other commands to read.
      `,
      exampleCommands: ['', 'a1b2c3d4'],
      inputs: [
        {
          name: 'app_id',
          description: `The ID of the app to link (e.g. ${chalk.green('a1b2c3d4')})`,
        },
      ],
      options: [
        {
          name: 'name',
          description: 'The app name to use during the linking of a new app',
        },
        {
          name: 'create',
          description: 'Create a new app on Ionic Pro and link it with this local Ionic project',
          type: Boolean,
          groups: [OptionGroup.Hidden],
        },
        {
          name: 'pro-id',
          description: 'Specify an app ID from the Ionic Pro to link',
          groups: [OptionGroup.Hidden],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { create } = options;

    if (inputs[0] && create) {
      throw new FatalException(`Sorry--cannot use both ${chalk.green('app_id')} and ${chalk.green('--create')}. You must either link an existing app or create a new one.`);
    }

    const proAppId = <string>options['pro-id'] || '';

    if (proAppId) {
      inputs[0] = proAppId;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { promptToLogin } = await import('@ionic/cli-utils/lib/session');

    let [ appId ] = inputs;
    let { create } = options;

    const project = await this.env.project.load();

    if (project.app_id) {
      if (project.app_id === appId) {
        this.env.log.msg(`Already linked with app ${chalk.green(appId)}.`);
        return;
      }

      const msg = appId ?
        `Are you sure you want to link it to ${chalk.green(appId)} instead?` :
        `Would you like to run link again?`;

      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `App ID ${chalk.green(project.app_id)} is already set up with this app. ${msg}`,
      });

      if (!confirm) {
        this.env.log.msg('Not linking.');
        return;
      }
    }

    if (!(await this.env.session.isLoggedIn())) {
      await promptToLogin(this.env);
    }

    if (!appId && !create) {
      const choices = [
        {
          name: `Link ${project.app_id ? 'a different' : 'an existing'} app on Ionic Pro`,
          value: CHOICE_LINK_EXISTING_APP,
        },
        {
          name: 'Create a new app on Ionic Pro',
          value: CHOICE_CREATE_NEW_APP,
        },
      ];

      if (project.app_id) {
        choices.unshift({
          name: `Relink ${chalk.green(project.app_id)}`,
          value: CHOICE_RELINK,
        });
      }

      const result = await this.env.prompt({
        type: 'list',
        name: 'whatToDo',
        message: 'What would you like to do?',
        choices,
      });

      if (result === CHOICE_CREATE_NEW_APP) {
        create = true;
      } else if (result === CHOICE_LINK_EXISTING_APP) {
        appId = await this.chooseApp();

        if (appId === CHOICE_NEVERMIND) {
          this.env.log.msg('Not linking app.');
        }
      } else if (result === CHOICE_RELINK) {
        appId = project.app_id;
      }
    }

    if (create) {
      let name = options['name'] ? String(options['name']) : undefined;

      if (!name) {
        name = await this.env.prompt({
          type: 'input',
          name: 'name',
          message: 'Please enter a name for your new app:',
          validate: v => validators.required(v),
        });
      }

      appId = await this.createApp({ name });
    } else {
      const app = await this.lookUpApp(appId);
      await this.linkApp(app);
    }

    await Promise.all([this.env.config.save(), this.env.project.save()]);
  }

  private async getAppClient() {
    const { AppClient } = await import('@ionic/cli-utils/lib/app');
    const token = await this.env.session.getUserToken();
    return new AppClient({ token, client: this.env.client });
  }

  private async getUserClient() {
    const { UserClient } = await import('@ionic/cli-utils/lib/user');
    const token = await this.env.session.getUserToken();
    return new UserClient({ token, client: this.env.client });
  }

  async lookUpApp(appId: string): Promise<App> {
    this.env.tasks.next(`Looking up app ${chalk.green(appId)}`);

    const appClient = await this.getAppClient();
    const app = await appClient.load(appId); // Make sure the user has access to the app

    this.env.tasks.end();

    return app;
  }

  async createApp({ name }: { name: string; }): Promise<string> {
    const appClient = await this.getAppClient();
    const app = await appClient.create({ name });

    await this.linkApp(app);

    return app.id;
  }

  async linkApp(app: App) {
    // TODO: load connections

    // TODO: check for git availability before this

    this.env.log.nl();

    this.env.log.info(
      `Ionic Pro uses a git-based workflow to manage app updates.\n` +
      `You will be prompted to set up the git host and repository for this new app. See the docs${chalk.bold('[1]')} for more information.\n\n` +
      `${chalk.bold('[1]')}: ${chalk.cyan('https://ionicframework.com/docs/pro/basics/git/')}`
    );

    const service = await this.env.prompt({
      type: 'list',
      name: 'gitService',
      message: 'Which git host would you like to use?',
      choices: [
        {
          name: 'GitHub',
          value: CHOICE_GITHUB,
        },
        {
          name: 'Ionic Pro',
          value: CHOICE_IONIC,
        },
        // TODO: option to skip git setup for now
      ],
    });

    let githubUrl: string | undefined;
    if (service === CHOICE_IONIC) {
      const config = await this.env.config.load();

      if (!config.git.setup) {
        await this.env.runCommand(['ssh', 'setup']);
      }

      await this.env.runCommand(['config', 'set', 'app_id', `"${app.id}"`, '--json']);
      await this.env.runCommand(['git', 'remote']);
    } else {
      if (service === CHOICE_GITHUB) {
        githubUrl = await this.linkGithub(app);
      }

      await this.env.runCommand(['config', 'set', 'app_id', `"${app.id}"`, '--json']);
    }

    this.env.log.ok(`Project linked with app ${chalk.green(app.id)}!`);
    if (service === CHOICE_GITHUB) {
      this.env.log.info(
        `Here are some additional links that can help you with you first push to GitHub:\n` +
        `${chalk.bold('Adding GitHub as a remote')}:\n\t${chalk.cyan('https://help.github.com/articles/adding-a-remote/')}\n\n` +
        `${chalk.bold('Pushing to a remote')}:\n\t${chalk.cyan('https://help.github.com/articles/pushing-to-a-remote/')}\n\n` +
        `${chalk.bold('Working with branches')}:\n\t${chalk.cyan('https://guides.github.com/introduction/flow/')}\n\n` +
        `${chalk.bold('More comfortable with a GUI? Try GitHub Desktop!')}\n\t${chalk.cyan('https://desktop.github.com/')}`
      );

      if (githubUrl) {
        this.env.log.info(
          `You can now push to one of your branches on GitHub to trigger a build in Ionic Pro!\n` +
          `If you haven't added GitHub as your origin you can do so by running:\n\n` +
          `${chalk.green('git remote add origin ' + githubUrl)}\n\n` +
          `You can find additional links above to help if you're having issues.`
        );
      }
    }
  }

  async linkGithub(app: App): Promise<string | undefined> {
    const { id } = await this.env.session.getUser();

    const userClient = await this.getUserClient();
    const user = await userClient.load(id, { fields: ['oauth_identities'] });

    if (!user.oauth_identities || !user.oauth_identities.github) {
      await this.oAuthProcess(id);
    }

    if (await this.needsAssociation(app, user.id)) {
      await this.confirmGithubRepoExists();
      const repoId = await this.selectGithubRepo();
      const branches = await this.selectGithubBranches(repoId);
      return this.connectGithub(app, repoId, branches);
    }
  }

  async confirmGithubRepoExists() {

    let confirm = false;

    this.env.log.nl();
    this.env.log.info(chalk.bold(`In order to link to a GitHub repository the repository must already exist on GitHub.`));
    this.env.log.info(
      `${chalk.bold('If the repository does not exist please create one now before continuing.')}\n` +
      `If you're not familiar with Git you can learn how to set it up with GitHub here:\n\n` +
      chalk.cyan(`https://help.github.com/articles/set-up-git/ \n\n`) +
      `You can find documentation on how to create a repository on GitHub and push to it here:\n\n` +
      chalk.cyan(`https://help.github.com/articles/create-a-repo/`)
    );

    confirm = await this.env.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Does the repository exist on GitHub?',
    });

    if (!confirm) {
      throw new FatalException('Repo Must exist on GitHub in order to link.');
    }
  }

  async oAuthProcess(userId: number) {
    const opn = await import('opn');

    const userClient = await this.getUserClient();

    let confirm = false;

    this.env.log.nl();
    this.env.log.info(
      `GitHub OAuth setup required.\n` +
      `To continue, we need you to authorize Ionic Pro with your GitHub account. ` +
      `A browser will open and prompt you to complete the authorization request. ` +
      `When finished, please return to the CLI to continue linking your app.`
    );

    confirm = await this.env.prompt({
      type: 'confirm',
      name: 'ready',
      message: 'Open browser:',
    });

    if (!confirm) {
      throw new FatalException('Aborting.');
    }

    const url = await userClient.oAuthGithubLogin(userId);
    opn(url, { wait: false });

    confirm = await this.env.prompt({
      type: 'confirm',
      name: 'ready',
      message: 'Authorized and ready to continue:',
    });

    if (!confirm) {
      throw new FatalException('Aborting.');
    }
  }

  async needsAssociation(app: App, userId: number): Promise<boolean> {
    const appClient = await this.getAppClient();

    if (app.association && app.association.repository.html_url) {
      this.env.log.msg(`App ${chalk.green(app.id)} already connected to ${chalk.bold(app.association.repository.html_url)}`);

      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Would you like to connect a different repo?',
      });

      if (!confirm) {
        return false;
      }

      try {
        // TODO: maybe we can use a PUT instead of DELETE now + POST later?
        await appClient.deleteAssociation(app.id);
      } catch (e) {
        if (isSuperAgentError(e)) {
          if (e.response.status === 401) {
            await this.oAuthProcess(userId);
            await appClient.deleteAssociation(app.id);
            return true;
          } else if (e.response.status === 404) {
            debug(`DELETE ${app.id} GitHub association not found`);
            return true;
          }
        }

        throw e;
      }
    }

    return true;
  }

  async connectGithub(app: App, repoId: number, branches: string[]): Promise<string | undefined> {
    const appClient = await this.getAppClient();

    try {
      const association = await appClient.createAssociation(app.id, { repoId, type: 'github', branches });
      this.env.log.ok(`App ${chalk.green(app.id)} connected to ${chalk.bold(association.repository.html_url)}`);
      return association.repository.html_url;
    } catch (e) {
      if (isSuperAgentError(e) && e.response.status === 403) {
        throw new FatalException(e.response.body.error.message);
      }
    }
  }

  formatRepoName(fullName: string) {
    const [ org, name ] = fullName.split('/');

    return `${chalk.dim(`${org} /`)} ${name}`;
  }

  async chooseApp(): Promise<string> {
    const { formatName } = await import('@ionic/cli-utils/lib/app');

    this.env.tasks.next(`Looking up your apps`);
    const apps: App[] = [];

    const appClient = await this.getAppClient();
    const paginator = appClient.paginate();

    for (const r of paginator) {
      const res = await r;
      apps.push(...res.data);
    }

    this.env.tasks.end();

    const neverMindChoice = {
      name: 'Nevermind',
      id: CHOICE_NEVERMIND,
      org: null, // tslint:disable-line
    };

    const linkedApp = await this.env.prompt({
      type: 'list',
      name: 'linkedApp',
      message: 'Which app would you like to link',
      choices: [neverMindChoice, ...apps].map(app => ({
        name: CHOICE_NEVERMIND === app.id ? chalk.bold(app.name) : `${formatName(app)} ${chalk.dim(`(${app.id})`)}`,
        value: app.id,
      })),
    });

    return linkedApp;
  }

  async selectGithubRepo(): Promise<number> {
    const user = await this.env.session.getUser();
    const userClient = await this.getUserClient();

    this.env.tasks.next('Looking up your GitHub repositories');

    const paginator = userClient.paginateGithubRepositories(user.id);
    const repos: GithubRepo[] = [];

    try {
      for (const r of paginator) {
        const res = await r;
        repos.push(...res.data);

        this.env.tasks.updateMsg(`Looking up your GitHub repositories: ${chalk.bold(String(repos.length))} found`);
      }
    } catch (e) {
      this.env.tasks.fail();

      if (isSuperAgentError(e) && e.response.status === 401) {
        await this.oAuthProcess(user.id);
        return this.selectGithubRepo();
      }

      throw e;
    }

    this.env.tasks.end();

    const repoId = await this.env.prompt({
      type: 'list',
      name: 'githubRepo',
      message: 'Which GitHub repository would you like to link?',
      choices: repos.map(repo => ({
        name: this.formatRepoName(repo.full_name),
        value: String(repo.id),
      })),
    });

    return Number(repoId);
  }

  async selectGithubBranches(repoId: number): Promise<string[]> {

    this.env.log.nl();
    this.env.log.info(chalk.bold(`By default Ionic Pro links only to the ${chalk.green('master')} branch.`));
    this.env.log.info(
      `${chalk.bold('If you\'d like to link to another branch or multiple branches you\'ll need to select each branch to connect to.')}\n` +
      `If you're not familiar with on working with branches in GitHub you can read about them here:\n\n` +
      chalk.cyan(`https://guides.github.com/introduction/flow/ \n\n`)
    );

    const choice = await this.env.prompt({
      type: 'list',
      name: 'githubMultipleBranches',
      message: 'Which would you like to do?',
      choices: [
        {
          name: `Link to master branch only`,
          value: CHOICE_MASTER_ONLY,
        },
        {
          name: `Link to specific branches`,
          value: CHOICE_SPECIFIC_BRANCHES,
        },
      ],
    });

    switch (choice) {
      case CHOICE_MASTER_ONLY:
        return ['master'];
      case CHOICE_SPECIFIC_BRANCHES:
        // fall through and begin prompting to choose branches
        break;
      default:
        throw new FatalException('Aborting. No branch choice specified.');
    }

    const user = await this.env.session.getUser();
    const userClient = await this.getUserClient();
    const paginator = userClient.paginateGithubBranches(user.id, repoId);
    this.env.tasks.next('Looking for available branches');
    const availableBranches: GithubBranch[] = [];
    try {
      for (const r of paginator) {
        const res = await r;
        availableBranches.push(...res.data);

        this.env.tasks.updateMsg(`Looking up the available branches on your GitHub repository: ${chalk.bold(String(availableBranches.length))} found`);
      }
    } catch (e) {
      this.env.tasks.fail();
      throw e;
    }
    this.env.tasks.end();

    const choices = availableBranches.map(branch => ({
      name: branch.name,
      value: branch.name,
      checked: branch.name === 'master',
    }));

    if (choices.length === 0) {
      this.env.log.warn('No branches found for the repository...linking to master branch.');
      return ['master'];
    }

    const selectedBranches = await this.env.prompt({
      type: 'checkbox',
      name: 'githubBranches',
      message: 'Which branch would you like to link?',
      choices: choices,
      default: ['master'],
    });

    return selectedBranches;
  }

}
