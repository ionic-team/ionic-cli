import * as fs from 'fs';
import * as path from 'path';

import * as open from 'open';
import * as chalk from 'chalk';
import * as pathExists from 'path-exists';
import * as fetch from 'node-fetch';

import { TaskChain } from '../lib/utils/task';
import { CommandLineInputs, CommandLineOptions, StarterTemplate } from '../definitions';
import { Command, CommandMetadata } from '../lib/command';
import { getCommandInfo } from '../lib/utils/environmentInfo';
import {
  isProjectNameValid,
  pkgInstallProject,
  tarXvf,
  isSafeToCreateProjectIn,
  getStarterTemplateText,
  getHelloText
} from '../lib/start';


const IONIC_DASH_URL = 'https://apps.ionic.io';
const STARTER_TEMPLATE_DEFAULT = 'blank';
const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'blank',
    description: 'A blank starter project for Ionic',
    path: 'https://github.com/driftyco/ionic2-starter-blank',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-blank/archive/master.tar.gz'
  },
  {
    name: 'tabs',
    description: 'A starting project for Ionic using a simple tabbed interface',
    path: 'https://github.com/driftyco/ionic2-starter-tabs',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-tabs/archive/master.tar.gz'
  },
  {
    name: 'sidemenu',
    description: 'A starting project for Ionic using a side menu with navigation in the content area',
    path: 'https://github.com/driftyco/ionic2-starter-sidemenu',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-sidemenu/archive/master.tar.gz'
  },
  {
    name: 'conference',
    description: 'A project for Ionic to demonstrate a realworld application',
    path: 'https://github.com/driftyco/ionic-conference-app',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic-conference-app/archive/master.tar.gz'
  },
  {
    name: 'tutorial',
    description: 'A tutorial based project for Ionic that goes along with the Ionic documentation',
    path: 'https://github.com/driftyco/ionic2-starter-tutorial',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-tutorial/archive/master.tar.gz'
  }
];

@CommandMetadata({
  name: 'start',
  description: 'Starts a new Ionic project in the specified PATH',
  inputs: [
    {
      name: 'name',
      description: 'directory and name for the new project'
    }, {
      name: 'template',
      description: 'Starter templates can either come from a named template (ex: tabs, sidemenu, blank)'
    }
  ],
  options: [
    {
      name: 'appname',
      description: 'Human readable name for the app (Use quotes around the name)',
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
      name: 'io-app-id',
      description: 'The Ionic.io app ID to use',
      aliases: []
    }
  ],
  isProjectTask: false
})
export class StartCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let installer = 'npm';
    let projectRoot: string;
    let projectName: string;

    /**
     * If --list is provided print starters available and then exit
     */
    if (options['list']) {
      return this.env.log.msg(getStarterTemplateText(STARTER_TEMPLATES));
    }

    if (inputs.length < 1) {
      throw 'Please provide a name for your project.';
    }
    if (!isProjectNameValid(inputs[0])) {
      throw `Please name your Ionic project something meaningful other than ${chalk.red(inputs[0])}`;
    }

    projectRoot = path.resolve(inputs[0]);
    projectName = path.basename(projectRoot);

    var tasks = new TaskChain();

    /**
     * Create the project directory
     */
    tasks.next(`Create directory ${projectRoot}`);

    if (!pathExists.sync(projectName)) {
      fs.mkdirSync(projectRoot);
    } else if (!isSafeToCreateProjectIn(projectRoot)) {
      throw `The directory ${projectName} contains file(s) that could conflict. Aborting.`;
    }

    let starterTemplateName = inputs[1] || options['template'] || STARTER_TEMPLATE_DEFAULT;
    let starterTemplate = STARTER_TEMPLATES.find(tpl => tpl['name'] === starterTemplateName);

    if (!starterTemplate) {
      throw `Unable to find starter template for ${starterTemplateName}`;
    }

    /**
     * Download the starter template, gunzip, and untar into the project folder
     */
    tasks.next(`Download '${starterTemplateName}' starter template`);
    this.env.log.debug(`\nDownloading:\n  ${starterTemplate.baseArchive}\n  ${starterTemplate.archive}`);

    const [
      baseArchiveResponse,
      archiveResponse
    ] = await Promise.all([
      fetch(starterTemplate.baseArchive),
      fetch(starterTemplate.archive)
    ]);

    await Promise.all([
      tarXvf(baseArchiveResponse.body, projectRoot),
      tarXvf(archiveResponse.body, projectRoot)
    ]);


    /**
     * Download the starter template, gunzip, and untar into the project folder
     */
    if (!options['skip-npm']) {
      tasks.next(`Executing: ${installer} install`);

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
    const confirmation = await this.env.inquirer.prompt({
      type: 'confirm',
      name: 'createAccount',
      message: 'Create an Ionic Cloud account to add features like User Authentication, ' +
           'Push Notifications, Live Updating, iOS builds, and more?'
    });

    if (confirmation['createAccount']) {
      open(IONIC_DASH_URL + '/signup');
    }
  }
}
