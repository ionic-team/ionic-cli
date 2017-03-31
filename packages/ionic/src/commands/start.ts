import * as fs from 'fs';
import * as path from 'path';

import * as chalk from 'chalk';
import fetch from 'node-fetch';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  TaskChain,
  getCommandInfo,
  getReleaseChannelName,
  rimrafp,
  validators,
} from '@ionic/cli-utils';

import {
  isProjectNameValid,
  pkgInstallProject,
  tarXvf,
  isSafeToCreateProjectIn,
  getStarterTemplateTextList,
  getHelloText,
  updatePackageJsonForCli,
  createProjectConfig
} from '../lib/start';

import { load } from '../lib/modules';
import { StarterTemplate } from '../definitions';
import { STARTER_TYPES, STARTER_TEMPLATES } from '../lib/starter-templates';

const IONIC_DASH_URL = 'https://apps.ionic.io';

@CommandMetadata({
  name: 'start',
  description: 'Creates a new project',
  exampleCommands: [
    'mynewapp blank',
    'mynewapp tabs --type=ionic-angular',
    'mynewapp blank --type=ionic1'
  ],
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
      description: `Starter templates can either come from a named template (ex: blank, tabs, maps)`,
      validators: [validators.required],
      prompt: {
        type: 'list',
        message: 'What starter would you like to use',
        choices: () => {
          function getAsChoice(text: string, index: number) {
            return {
              name: text,
              short: STARTER_TEMPLATES[index].name,
              value: STARTER_TEMPLATES[index].name
            };
          }
          let starterTemplates = STARTER_TEMPLATES.filter(st => st.typeId === 'ionic-angular');
          return getStarterTemplateTextList(starterTemplates)
            .map(getAsChoice);
        }
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
      type: String,
      aliases: ['a']
    },
    {
      name: 'skip-npm',
      description:  'Skip npm package installation',
      type: Boolean,
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
      type: String
    },
    {
      name: 'skip-link',
      description: 'Do not link app to an Ionic Account',
      type: Boolean
    }
  ]
})
export class StartCommand extends Command {
  async prerun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {

    // If the action is list then lets just end here.
    if (options['list']) {

      this.env.log.msg(getStarterTemplateTextList(STARTER_TEMPLATES).join('\n'));
      return 0;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [projectName, starterTemplateName] = inputs;
    let appName = <string>options['appname'] || projectName;
    let cloudAppId = <string>options['cloud-app-id'] || '';
    let starterBranchName = <string>options['starterBranchName'] || 'master';
    let wrapperBranchName = <string>options['wrapperBranchName'] || 'master';
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

    const pathExists = load('path-exists');
    if (!pathExists.sync(projectName)) {
      tasks.next(`Creating directory ${chalk.green(projectRoot)}`);
      fs.mkdirSync(projectRoot);
    } else if (!isSafeToCreateProjectIn(projectRoot)) {
      const inquirer = load('inquirer');
      const response = await inquirer.prompt({
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

    let starterTemplateMatches: StarterTemplate[] = STARTER_TEMPLATES.filter(startTemplate => startTemplate.name === starterTemplateName);
    let starterTemplate: StarterTemplate | undefined = starterTemplateMatches[0];

    if (starterTemplateMatches.length > 1) {
      starterTemplate = starterTemplateMatches.find(startTemplate => startTemplate.typeId === options['type']);
    }

    if (!starterTemplate) {
      throw `Unable to find starter template for ${starterTemplateName}`;
    }

    /**
     * Download the starter template, gunzip, and untar into the project folder
     */
    tasks.next(`Downloading '${chalk.green(starterTemplateName.toString())}' starter template`);

    let baseArchiveResponse;
    let archiveResponse;
    let wrapperBranchPath = starterType.baseArchive.replace('<BRANCH_NAME>', wrapperBranchName);
    let starterBranchPath = starterTemplate.archive.replace('<BRANCH_NAME>', starterBranchName);
    try {
      [ baseArchiveResponse, archiveResponse] = await Promise.all([
        fetch(wrapperBranchPath),
        fetch(starterBranchPath)
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
    await updatePackageJsonForCli(appName, starterType, projectRoot, releaseChannelName);

    tasks.next(`Creating configuration file for the new project`);
    await createProjectConfig(appName, starterType, projectRoot, cloudAppId);


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

    if (!options['skip-link']) {
      const inquirer = load('inquirer');
      const token = await this.env.session.getUserToken();
      const { linkApp } = await inquirer.prompt({
        type: 'confirm',
        name: 'linkApp',
        message: 'Link this app to your Ionic Dashboard to use tools like Ionic View?'
      });

      if (linkApp && token) {
        const opn = load('opn');
        const token = await this.env.session.getUserToken();
        opn(`https://apps.ionic.io/?user_token=${token}`, { wait: false });
        this.env.log.ok(`\nRun ${chalk.green(`ionic link`)} to link to the app.`);

        opn(IONIC_DASH_URL + '/signup', { wait: false });
      } else if (linkApp) {
        this.env.log.msg(`You will need to login in order to link this app. Please run the following commands to do so.\n` +
          ` ${chalk.green(`ionic login`)} - login first\n` +
          ` ${chalk.green(`ionic link`)} - then link your app]n`);
      }
    }

    if (!cliFlags.promptedForTelemetry) {
      const inquirer = load('inquirer');
      const { optIn } = await inquirer.prompt({
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
