import { BaseError, InputValidationError, PackageJson, stripOptions } from '@ionic/cli-framework';
import { readPackageJsonFile } from '@ionic/cli-framework/utils/node';
import { processExit } from '@ionic/utils-process';
import * as Debug from 'debug';
import * as path from 'path';

import { IonicNamespace } from './commands';
import { IPCMessage, IonicContext } from './definitions';
import { isExitCodeException, isSuperAgentError } from './guards';
import { generateIonicEnvironment } from './lib';
import { failure, input, strong } from './lib/color';
import { Executor } from './lib/executor';
import { mapLegacyCommand } from './lib/init';

export * from './constants';
export * from './guards';
export * from './definitions';

const debug = Debug('ionic');

const PACKAGE_ROOT_PATH = __dirname;
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
    throw new Error(`Missing "${strong('bin.ionic')}" in Ionic CLI package.json`);
  }

  if (!pkg.main) {
    throw new Error(`Missing "${strong('main')}" in Ionic CLI package.json`);
  }

  return {
    binPath: path.resolve(PACKAGE_ROOT_PATH, pkg.bin.ionic),
    libPath: PACKAGE_ROOT_PATH,
    execPath: process.cwd(),
    version: pkg.version,
  };
}

export async function loadExecutor(ctx: IonicContext, pargv: string[]): Promise<Executor> {
  if (!_executor) {
    const deps = await generateIonicEnvironment(ctx, pargv);
    const namespace = new IonicNamespace(deps);
    _executor = new Executor({ namespace });
  }

  return _executor;
}

export async function run(pargv: string[]): Promise<void> {
  let err: any;
  let executor: Executor;

  try {
    executor = await loadExecutor(await generateContext(), pargv);
  } catch (e) {
    process.stderr.write(`${e.message ? e.message : (e.stack ? e.stack : e)}\n`);
    process.exitCode = 1;
    return;
  }

  const ienv = executor.namespace.env;

  if (pargv[0] !== '_') {
    try {
      debug('Context: %o', ienv.ctx);

      ienv.config.set('version', ienv.ctx.version);

      const token = process.env['IONIC_TOKEN'];
      const email = process.env['IONIC_EMAIL'];
      const password = process.env['IONIC_PASSWORD'];

      if (token) {
        const wasLoggedIn = ienv.session.isLoggedIn();
        debug(`${strong('IONIC_TOKEN')} environment variable detected`);

        if (ienv.config.get('tokens.user') !== token) {
          debug(`${strong('IONIC_TOKEN')} mismatch with current session--attempting login`);
          await ienv.session.tokenLogin(token);

          if (wasLoggedIn) {
            ienv.log.info(`You have been logged out--using ${strong('IONIC_TOKEN')} environment variable`);
          }
        }
      } else if (email && password) {
        debug(`${strong('IONIC_EMAIL')} / ${strong('IONIC_PASSWORD')} environment variables detected`);

        if (ienv.config.get('user.email') !== email) {
          debug(`${strong('IONIC_EMAIL')} mismatch with current session--attempting login`);

          try {
            await ienv.session.login(email, password);
          } catch (e) {
            ienv.log.error(`Error occurred during automatic login via ${strong('IONIC_EMAIL')} / ${strong('IONIC_PASSWORD')} environment variables.`);
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
          `The ${input(parsedArgs[0])} command has been renamed. To find out more, run:\n\n` +
          `    ${input(`ionic ${foundCommand} --help`)}\n\n`
        );
      } else {
        await executor.execute(pargv, process.env);
      }

      if (ienv.flags.interactive) {
        const updateNotifier = await import('update-notifier');
        updateNotifier({ pkg: await loadPackageJson() }).notify({ isGlobal: true });
      }
    } catch (e) {
      err = e;
    }
  }

  if (err) {
    process.exitCode = 1;

    if (err instanceof InputValidationError) {
      for (const e of err.errors) {
        ienv.log.error(e.message);
      }
      ienv.log.msg(`Use the ${input('--help')} flag for more details.`);
    } else if (isSuperAgentError(err)) {
      const { formatSuperAgentError } = await import('./lib/http');
      ienv.log.rawmsg(formatSuperAgentError(err));
    } else if (err.code && err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      ienv.log.error(
        `Network connectivity error occurred, are you offline?\n` +
        `If you are behind a firewall and need to configure proxy settings, see: ${strong('https://ion.link/cli-proxy-docs')}\n\n` +
        failure(String(err.stack ? err.stack : err))
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
      ienv.log.msg(failure(String(err.stack ? err.stack : err)));

      if (err.stack) {
        debug(failure(String(err.stack)));
      }
    }
  }
}

export async function receive(msg: IPCMessage) {
  if (!_executor) {
    throw new Error('Executor not initialized.');
  }

  const { env, project } = _executor.namespace;

  if (msg.type === 'telemetry') {
    const { sendCommand } = await import('./lib/telemetry');

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
