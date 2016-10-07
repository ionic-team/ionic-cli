import { ionicCommandOptions, CommandMetadata } from '../ionic';

export const metadata: CommandMetadata = {
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
      default: true,
      aliases: []
    },
    {
      name: 'no-cordova',
      description:  'Create a basic structure without Cordova requirements',
      type: Boolean,
      default: true,
      aliases: ['w']
    },
    {
      name: 'sass',
      description:  'Setup the project to use Sass CSS precompiling',
      type: Boolean,
      default: true,
      aliases: ['s']
    },
    {
      name: 'list',
      description:  'List starter templates available',
      type: Boolean,
      default: true,
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
};

export function run(env: ionicCommandOptions): Promise<void> | void {
  const logger = env.utils.log;

  logger.msg(env.argv);
}
