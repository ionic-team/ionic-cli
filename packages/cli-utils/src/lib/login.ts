import * as chalk from 'chalk';
import { validators } from './validators';
import { IonicEnvironment } from '../definitions';

export async function promptToLogin(env: IonicEnvironment): Promise<void> {
  env.log.msg(`Log into your Ionic account\nIf you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);

  const { email, password } = await env.prompt([{
    type: 'input',
    name: 'email',
    message: 'Email:',
    validate: (input: string) => validators.email(input),
  }, {
      type: 'password',
      name: 'password',
      message: 'Password:'
    }]);

  await env.session.login(email, password);
}
