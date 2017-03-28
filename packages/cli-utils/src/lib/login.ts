import * as chalk from 'chalk';
import { validators } from './validators';
import { ISession, ILogger } from '../definitions';
import { load } from './modules';

export async function promptToLogin(log: ILogger, session: ISession): Promise<void> {
  log.msg( `Log into your Ionic account\nIf you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);

  const inquirer = load('inquirer');
  const { email, password } = await inquirer.prompt([{
    type: 'input',
    name: 'email',
    message: 'Email:',
    validate: validators.email
  }, {
    type: 'password',
    name: 'password',
    message: 'Password:'
  }]);
  await session.login(email, password);
}
