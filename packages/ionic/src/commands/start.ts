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
      description: `Starter templates can either come from a named template (ex: tabs, sidemenu, blank)`
    }
  ],
  availableOptions: [
    {
      name: 'appname',
      description: 'Human readable name for the app (Use quotes around the name)',
      type: String,
      default: null,
      aliases: ['a']
    }
  ],
  isProjectTask: false
};

export function run(env: ionicCommandOptions): Promise<void> | void {
  const logger = env.utils.log;

  logger.msg(env.argv);
}
