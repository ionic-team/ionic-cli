import * as inquirer from 'inquirer';
import * as chalk from 'chalk';
import { validators } from './validators';
import { ISession, ILogger } from '../definitions';

export async function promptToLogin(inquirerInst: inquirer.Inquirer, log: ILogger, session: ISession): Promise<void> {
  log.msg( `Log into your Ionic account\nIf you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);

  const { email, password } = await inquirerInst.prompt([{
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
