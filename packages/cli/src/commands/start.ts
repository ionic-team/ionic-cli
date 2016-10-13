import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import * as pathExists from 'path-exists';
import * as zlib from 'zlib';
import * as tar from 'tar';
import { spawn } from 'cross-spawn';
import * as fetch from 'node-fetch';
import * as stream from 'stream';

import { IonicCommandOptions, CommandMetadata, ICommand } from '../definitions';
import { getCommandInfo } from '../lib/utils/environmentInfo';
import Command from '../lib/command';

interface StarterTemplate {
  name: string;
  path: string;
  baseArchive: string;
  archive: string;
}

const STARTER_TEMPLATE_DEFAULT = 'blank';
const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'blank',
    path: 'https://github.com/driftyco/ionic2-starter-blank',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-blank/archive/master.tar.gz'
  },
  {
    name: 'tabs',
    path: 'https://github.com/driftyco/ionic2-starter-tabs',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-tabs/archive/master.tar.gz'
  },
  {
    name: 'sidemenu',
    path: 'https://github.com/driftyco/ionic2-starter-sidemenu',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic2-starter-sidemenu/archive/master.tar.gz'
  },
  {
    name: 'conference',
    path: 'https://github.com/driftyco/ionic-conference-app',
    baseArchive: 'https://github.com/driftyco/ionic2-app-base/archive/master.tar.gz',
    archive: 'https://github.com/driftyco/ionic-conference-app/archive/master.tar.gz'
  },
  {
    name: 'tutorial',
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
  availableOptions: [
    {
      name: 'appname',
      description: 'Human readable name for the app (Use quotes around the name)',
      type: String,
      default: null,
      aliases: ['a']
    },
    {
      name: 'id',
      description: 'Package name for <widget id> config, ex: com.mycompany.myapp',
      type: String,
      default: null,
      aliases: ['i']
    },
    {
      name: 'skip-npm',
      description:  'Skip npm package installation',
      type: Boolean,
      default: false,
      aliases: []
    },
    {
      name: 'no-cordova',
      description:  'Create a basic structure without Cordova requirements',
      type: Boolean,
      default: false,
      aliases: ['w']
    },
    {
      name: 'list',
      description:  'List starter templates available',
      type: Boolean,
      default: false,
      aliases: ['l']
    },
    {
      name: 'io-app-id',
      description: 'The Ionic.io app ID to use',
      type: String,
      default: null,
      aliases: []
    },
    {
      name: 'template',
      description: 'Project starter template',
      type: String,
      default: null,
      aliases: ['t']
    },
    {
      name: 'zip-file',
      description: 'URL to download zipfile for starter template',
      type: String,
      default: null,
      aliases: ['z']
    }
  ],
  isProjectTask: false
})
export default class StartCommand extends Command implements ICommand {
  async run(env: IonicCommandOptions): Promise<void> {
    const logger = env.utils.log;
    const inputs = env.argv._;
    let installer = 'npm';
    let projectRoot: string;
    let projectName: string;
    let starterTemplateName: string;
    let starterTemplate: StarterTemplate;

    if (inputs.length < 1) {
      throw 'Please provide a name for your project.';
    }
    if (!isProjectNameValid(inputs[0])) {
      throw `Please name your Ionic project something meaningful other than ${chalk.red(inputs[0])}`;
    }

    projectRoot = path.resolve(inputs[0]);
    projectName = path.basename(projectRoot);

    if (!pathExists.sync(projectName)) {
      fs.mkdirSync(projectRoot);
      logger.info(`Making directory ${projectRoot}`);
    } else if (!isSafeToCreateProjectIn(projectRoot)) {
      throw `The directory ${projectName} contains file(s) that could conflict. Aborting.`;
    }

    starterTemplateName = inputs[1] || env.argv['template'] || STARTER_TEMPLATE_DEFAULT;
    starterTemplate = STARTER_TEMPLATES.find(tpl => tpl['name'] === starterTemplateName);

    if (!starterTemplate) {
      throw `Unable to find starter template for ${starterTemplateName}`;
    }

    const [
      baseArchive,
      archive
    ] = await Promise.all([
      fetch(starterTemplate.baseArchive),
      fetch(starterTemplate.archive)
    ]);

    await Promise.all([
      tarXvf(baseArchive['body'], projectRoot),
      tarXvf(archive['body'], projectRoot)
    ]);

    if (env.argv['skip-npm']) {
      return logger.msg('Project started!');
    }

    if (env.argv['yarn']) {
      let yarnVersion = await getCommandInfo('yarn', ['-version']);
      if (yarnVersion) {
        installer = 'yarn';
      }
    }

    logger.msg('Installing dependencies. This might take a couple minutes.');
    await install(installer, projectRoot);
  }
}

/**
 * Spawn an npm install task from within 
 */
function install(installer: string, root: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn(installer, ['install'], {cwd: root, stdio: 'inherit'});
    proc.on('close', function (code: Number) {
      if (code !== 0) {
        return reject(`${installer} install failed`);
      }
      resolve();
    });
  });
}

function tarXvf(readStream: stream.Readable, destination: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const baseArchiveExtract = tar.Extract({
        path: destination,
        strip: 1
      })
      .on('error', reject)
      .on('end', resolve);
    try {
      readStream
        .pipe(zlib.createGunzip())
        .pipe(baseArchiveExtract);
    } catch (e) {
      reject(e);
    }
  });
}

function isProjectNameValid(name: string): boolean {
  return name !== '.';
}

// If project only contains files generated by GH, it’s safe.
// We also special case IJ-based products .idea because it integrates with CRA:
// https://github.com/facebookincubator/create-react-app/pull/368#issuecomment-243446094
function isSafeToCreateProjectIn(root: string): boolean {
  var validFiles = [
    '.DS_Store', 'Thumbs.db', '.git', '.gitignore', '.idea', 'README.md', 'LICENSE'
  ];
  return fs.readdirSync(root)
    .every(function(file) {
      return validFiles.indexOf(file) >= 0;
    });
}
