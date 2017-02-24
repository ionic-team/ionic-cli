import * as fs from 'fs';
import * as path from 'path';

import * as opn from 'opn';
import * as chalk from 'chalk';
import * as pathExists from 'path-exists';
import fetch from 'node-fetch';

import {
  TaskChain,
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  getCommandInfo,
  validators,
  rimrafp
} from '@ionic/cli-utils';

import {
  isProjectNameValid,
  pkgInstallProject,
  tarXvf,
  isSafeToCreateProjectIn,
  getStarterTemplateTextList,
  getHelloText,
  updateDependenciesForCLI
} from '../lib/start';

import { getReleaseChannelName } from '../lib/plugins';
import { StarterTemplate } from '../definitions';


const IONIC_DASH_URL = 'https://apps.ionic.io';
const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'blank',
    description: 'A blank starter project',
    path: 'driftyco/ionic2-starter-blank',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-blank/archive/master.tar.gz'
  },
  {
    name: 'tabs',
    description: 'A starting project with a simple tabbed interface',
    path: 'driftyco/ionic2-starter-tabs',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-tabs/archive/master.tar.gz'
  },
  {
    name: 'sidemenu',
    description: 'A starting project with a side menu with navigation in the content area',
    path: 'driftyco/ionic2-starter-sidemenu',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-sidemenu/archive/master.tar.gz'
  },
  {
    name: 'conference',
    description: 'A project that demonstrates a realworld application',
    path: 'driftyco/ionic-conference-app',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic-conference-app/archive/master.tar.gz'
  },
  {
    name: 'tutorial',
    description: 'A tutorial based project that goes along with the Ionic documentation',
    path: 'driftyco/ionic2-starter-tutorial',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-tutorial/archive/master.tar.gz'
  }
];

@CommandMetadata({
  name: 'start',
  description: 'Creates a new project',
  exampleCommands: ['mynewapp blank'],
  inputs: [
    {
      name: 'name',
      description: 'directory and name for the new project',
      validators: [validators.required],
      prompt: {
        message: 'What would you like to name your project:'
      }
    },
    {
      name: 'template',
      description: `Starter templates can either come from a named template (ex: ${STARTER_TEMPLATES.map(st => st.name).join(', ')})`,
      validators: [validators.required],
      prompt: {
        type: 'list',
        message: 'What starter would you like to use',
        choices: getStarterTemplateTextList(STARTER_TEMPLATES).map((text, i) => ({
          name: text,
          short: STARTER_TEMPLATES[i].name,
          value: STARTER_TEMPLATES[i].name
        }))
      }
    }
  ],
  options: [
    {
      name: 'appname',
      description: 'Human readable name for the app (Use quotes around the name',
      aliases: ['a']
    },
    {
      name: 'id',
      description: 'Package name for <widget id> config, ex: com.mycompany.myapp',
      aliases: ['i']
    },
    {
      name: 'skip-npm',
      description:  'Skip npm package installation',
      type: Boolean,
      aliases: []
    },
    {
      name: 'no-cordova',
      description:  'Create a basic structure without Cordova requirements',
      type: Boolean,
      aliases: ['w']
    },
    {
      name: 'list',
      description:  'List starter templates available',
      type: Boolean,
      aliases: ['l']
    },
    {
      name: 'cloud-app-id',
      description: 'An existing Ionic.io app ID to link with',
      aliases: []
    }
  ]
})
export class StartCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [projectName, starterTemplateName] = inputs;
    let installer = 'npm';
    let projectRoot: string;

    if (!isProjectNameValid(projectName)) {
      throw `Please name your Ionic project something meaningful other than ${chalk.red(projectName)}`;
    }

    projectRoot = path.resolve(projectName);
    projectName = path.basename(projectRoot);

    var tasks = new TaskChain();

    /**
     * Create the project directory
     */

    if (!pathExists.sync(projectName)) {
      tasks.next(`Creating directory ${chalk.green(projectRoot)}`);
      fs.mkdirSync(projectRoot);
    } else if (!isSafeToCreateProjectIn(projectRoot)) {
      const response = await this.env.inquirer.prompt({
        type: 'confirm',
        name: 'overwrite',
        message: `The directory ${chalk.green(projectName)} contains file(s) that could conflict. ` +
            'Would you like to overwrite the directory with this new project?'
      });

      if (response['overwrite']) {
        try {
          tasks.next(`Creating directory ${chalk.green(projectRoot)}`);
          await rimrafp(projectRoot);
          fs.mkdirSync(projectRoot);
        } catch (e) {
          throw e;
        }
      } else {
        throw `\nPlease provide a projectName that does not conflict with this directory.\n`;
      }
    }

    let starterTemplate = STARTER_TEMPLATES.find(tpl => tpl['name'] === starterTemplateName);

    if (!starterTemplate) {
      throw `Unable to find starter template for ${starterTemplateName}`;
    }

    /**
     * Download the starter template, gunzip, and untar into the project folder
     */
    tasks.next(`Downloading '${chalk.green(starterTemplateName.toString())}' starter template`);

    let baseArchiveResponse;
    let archiveResponse;
    try {
      [ baseArchiveResponse, archiveResponse] = await Promise.all([
        fetch(starterTemplate.baseArchive),
        fetch(starterTemplate.archive)
      ]);
    } catch (e) {
      if (['ETIMEOUT', 'ENOTFOUND'].includes(e.code)) {
        this.env.log.debug(e);
        this.env.log.error(`Unable to download starter template from github. Please check that you are ` +
                          `able to access the following urls: \n${starterTemplate.baseArchive},\n${starterTemplate.archive}\n`);
        return;
      }
      throw e;
    }

    if (!baseArchiveResponse || !archiveResponse) {
      this.env.log.error(`Unable to download starter template from github. Please check that you are ` +
                        `able to access the following urls: \n${starterTemplate.baseArchive},\n${starterTemplate.archive}\n`);
      return;
    }

    await Promise.all([
      tarXvf(baseArchiveResponse.body, projectRoot),
      tarXvf(archiveResponse.body, projectRoot)
    ]);

    tasks.next(`Updating project dependencies to add core plugins`);
    const releaseChannelName = await getReleaseChannelName();
    await updateDependenciesForCLI(projectRoot, releaseChannelName);


    /**
     * Download the starter template, gunzip, and untar into the project folder
     */
    if (!options['skip-npm']) {
      tasks.next(`Executing: ${chalk.green(installer + ' install')} within the newly created project directory`);

      if (options['yarn']) {
        let yarnVersion = await getCommandInfo('yarn', ['-version']);
        if (yarnVersion) {
          installer = 'yarn';
        }
      }
      await pkgInstallProject(installer, projectRoot);
    }
    tasks.end();


    /**
     * Print out hello text about how to get started
     */
    this.env.log.msg(getHelloText());

    /**
     * Ask the user if they would like to create a cloud account
     */
    let { cliFlags } = await this.env.config.load();

    if (!cliFlags.promptedForSignup) {
      const { createAccount } = await this.env.inquirer.prompt({
        type: 'confirm',
        name: 'createAccount',
        message: 'Create a free Ionic account to add features like User Authentication, ' +
            'Push Notifications, Live Updating, iOS builds, and more?'
      });

      if (createAccount) {
        opn(IONIC_DASH_URL + '/signup', { wait: false });
      }
      cliFlags.promptedForSignup = true;
      this.env.log.msg(`\n`);
    }

    if (!cliFlags.promptedForTelemetry) {
      const { optIn } = await this.env.inquirer.prompt({
        type: 'confirm',
        name: 'optIn',
        message: 'Would you like to help Ionic improve the CLI by providing anonymous ' +
          'usage and error reporting information?'
      });
      cliFlags.promptedForTelemetry = true;
      cliFlags.enableTelemetry = optIn;
    }

    this.env.log.msg(`\nGo to your newly created project: ${chalk.green(`cd ${projectRoot}`)}\n`);
  }
}
