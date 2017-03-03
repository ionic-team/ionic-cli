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
import { STARTER_TYPES, STARTER_TEMPLATES } from '../lib/starter-templates';

const IONIC_DASH_URL = 'https://apps.ionic.io';

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
      name: 'type',
      description: `Type of project to start. The default is 'ionic-angular'. (ex: ${STARTER_TYPES.map(st => st.id).join(', ')})`,
      type: String,
      default: 'ionic-angular'
    },
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
  async prerun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {

    // If the action is list then lets just end here.
    if (options['list']) {

      this.env.log.msg(getStarterTemplateTextList(STARTER_TEMPLATES));
      return 0;
    }
  }

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

    let starterType = STARTER_TYPES.find(type => type['id'] === options['type']);

    if (!starterType) {
      throw `Unable to find starter type for ${options['type']}`;
    }

    let starterTemplate = STARTER_TEMPLATES.find((starterType => {
      return (tpl: StarterTemplate) => (
        tpl['name'] === starterTemplateName && tpl['typeId'] === starterType.name
      );
    })(starterType));

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
        fetch(starterType.baseArchive),
        fetch(starterTemplate.archive)
      ]);
    } catch (e) {
      if (['ETIMEOUT', 'ENOTFOUND'].includes(e.code)) {
        this.env.log.debug(e);
        this.env.log.error(`Unable to download starter template from github. Please check that you are ` +
                          `able to access the following urls: \n${starterType.baseArchive},\n${starterTemplate.archive}\n`);
        return;
      }
      throw e;
    }

    if (!baseArchiveResponse || !archiveResponse) {
      this.env.log.error(`Unable to download starter template from github. Please check that you are ` +
                        `able to access the following urls: \n${starterType.baseArchive},\n${starterTemplate.archive}\n`);
      return;
    }

    await Promise.all([
      tarXvf(baseArchiveResponse.body, projectRoot),
      tarXvf(archiveResponse.body, projectRoot)
    ]);

    tasks.next(`Updating project dependencies to add required plugins`);
    const releaseChannelName = await getReleaseChannelName();
    await updateDependenciesForCLI(starterType, projectRoot, releaseChannelName);


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
