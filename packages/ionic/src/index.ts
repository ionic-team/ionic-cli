import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';

import { BaseError, InputValidationError, PackageJson, stripOptions } from '@ionic/cli-framework';
import { readPackageJsonFile } from '@ionic/cli-framework/utils/npm';
import { processExit } from '@ionic/cli-framework/utils/process';

import { IPCMessage, IonicContext, generateIonicEnvironment, isExitCodeException, isSuperAgentError } from '@ionic/cli-utils';
import { Executor } from '@ionic/cli-utils/lib/executor';
import { mapLegacyCommand } from '@ionic/cli-utils/lib/init';

import { IonicNamespace } from './commands';

const debug = Debug('ionic:cli');

const PACKAGE_ROOT_PATH = path.dirname(path.dirname(__filename));
const PACKAGE_JSON_PATH = path.resolve(PACKAGE_ROOT_PATH, 'package.json');

let _pkg: PackageJson | undefined;
let _executor: Executor | undefined;

async function loadPackageJson(): Promise<PackageJson> {
  if (!_pkg) {
    _pkg = await readPackageJsonFile(PACKAGE_JSON_PATH);
  }

  return _pkg;
}

export async function generateContext(): Promise<IonicContext> {
  const pkg = await loadPackageJson();

  if (!pkg.bin || !pkg.bin.ionic) {
    throw new Error(`Missing "${chalk.bold('bin.ionic')}" in Ionic CLI package.json`);
  }

  if (!pkg.main) {
    throw new Error(`Missing "${chalk.bold('main')}" in Ionic CLI package.json`);
  }

  return {
    binPath: path.resolve(PACKAGE_ROOT_PATH, pkg.bin.ionic),
    libPath: path.resolve(PACKAGE_ROOT_PATH, pkg.main),
    execPath: process.cwd(),
    version: pkg.version,
  };
}

export async function loadExecutor(ctx: IonicContext, pargv: string[], env: { [k: string]: string; }): Promise<Executor> {
  if (!_executor) {
    const { env: ienv, project } = await generateIonicEnvironment(ctx, pargv, env);
    const namespace = new IonicNamespace(undefined, ienv, project);
    _executor = new Executor({ namespace });
  }

  return _executor;
}

export async function run(pargv: string[], env: { [k: string]: string; }) {
  let err: any;
  let executor: Executor;

  try {
    executor = await loadExecutor(await generateContext(), pargv, env);
  } catch (e) {
    process.stderr.write(`${e.message ? e.message : (e.stack ? e.stack : e)}\n`);
    process.exitCode = 1;
    return;
  }

  const ienv = executor.namespace.env;

  if (pargv[0] !== '_') {
    try {
      debug('Context: %o', ienv.ctx);

      if (env['IONIC_TOKEN']) {
        const wasLoggedIn = await ienv.session.isLoggedIn();
        debug(`${chalk.bold('IONIC_TOKEN')} environment variable detected`);

        if (ienv.config.get('tokens.user') !== env['IONIC_TOKEN']) {
          debug(`${chalk.bold('IONIC_TOKEN')} mismatch with current session--attempting login`);
          await ienv.session.tokenLogin(env['IONIC_TOKEN']);

          if (wasLoggedIn) {
            ienv.log.info(`You have been logged out--using ${chalk.bold('IONIC_TOKEN')} environment variable`);
          }
        }
      } else if (env['IONIC_EMAIL'] && env['IONIC_PASSWORD']) {
        debug(`${chalk.bold('IONIC_EMAIL')} / ${chalk.bold('IONIC_PASSWORD')} environment variables detected`);

        if (ienv.config.get('user.email') !== env['IONIC_EMAIL']) {
          debug(`${chalk.bold('IONIC_EMAIL')} mismatch with current session--attempting login`);

          try {
            await ienv.session.login(env['IONIC_EMAIL'], env['IONIC_PASSWORD']);
          } catch (e) {
            ienv.log.error(`Error occurred during automatic login via ${chalk.bold('IONIC_EMAIL')} / ${chalk.bold('IONIC_PASSWORD')} environment variables.`);
            throw e;
          }
        }
      }

      const parsedArgs = stripOptions(pargv, { includeSeparated: false });
      const foundCommand = mapLegacyCommand(parsedArgs[0]);

      // If an legacy command is being executed inform the user that there is a
      // new command available
      if (foundCommand) {
        ienv.log.msg(
          `The ${chalk.green(parsedArgs[0])} command has been renamed. To find out more, run:\n\n` +
          `    ${chalk.green(`ionic ${foundCommand} --help`)}\n\n`
        );
      } else {
        await executor.execute(pargv, env);
      }

      if (ienv.flags.interactive) {
        const updateNotifier = await import('update-notifier');
        updateNotifier({ pkg: await loadPackageJson() }).notify({ isGlobal: true });
      }
    } catch (e) {
      err = e;
    }

    ienv.config.set('version', ienv.ctx.version);
  }

  if (err) {
    ienv.tasks.fail();
    process.exitCode = 1;

    if (err instanceof InputValidationError) {
      for (const e of err.errors) {
        ienv.log.error(e.message);
      }
      ienv.log.msg(`Use the ${chalk.green('--help')} flag for more details.`);
    } else if (isSuperAgentError(err)) {
      const { formatSuperAgentError } = await import('@ionic/cli-utils/lib/http');
      ienv.log.rawmsg(formatSuperAgentError(err));
    } else if (err.code && err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      ienv.log.error(
        `Network connectivity error occurred, are you offline?\n` +
        `If you are behind a firewall and need to configure proxy settings, see: ${chalk.bold('https://ionicframework.com/docs/cli/configuring.html#using-a-proxy')}\n\n` +
        chalk.red(String(err.stack ? err.stack : err))
      );
    } else if (isExitCodeException(err)) {
      if (err.message) {
        if (err.exitCode > 0) {
          ienv.log.error(err.message);
        } else {
          ienv.log.msg(err.message);
        }
      }

      await processExit(err.exitCode);
    } else if (err instanceof BaseError) {
      ienv.log.error(err.message);
    } else {
      ienv.log.msg(chalk.red(String(err.stack ? err.stack : err)));

      if (err.stack) {
        debug(chalk.red(String(err.stack)));
      }
    }
  }

  ienv.close();
}

export async function receive(msg: IPCMessage) {
  if (!_executor) {
    throw new Error('Executor not initialized.');
  }

  const { env, project } = _executor.namespace;

  if (msg.type === 'telemetry') {
    const { sendCommand } = await import('@ionic/cli-utils/lib/telemetry');

    await sendCommand({
      getInfo: env.getInfo,
      client: env.client,
      config: env.config,
      ctx: env.ctx,
      project,
      session: env.session,
    }, msg.data.command, msg.data.args);
  }
}
