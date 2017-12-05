import * as path from 'path';
import * as util from 'util';

import chalk from 'chalk';

import { IonicEnvironment, RootPlugin, generateIonicEnvironment } from '@ionic/cli-utils';
import { Exception } from '@ionic/cli-utils/lib/errors';
import { mapLegacyCommand, modifyArguments, parseArgs } from '@ionic/cli-utils/lib/init';
import { pathExists } from '@ionic/cli-framework/utils/fs';
import { isExitCodeException } from '@ionic/cli-utils/guards';

import { IonicNamespace } from './commands';

export const namespace = new IonicNamespace();

export async function generateRootPlugin(): Promise<RootPlugin> {
  const { getPluginMeta } = await import('@ionic/cli-utils/lib/plugins');

  return {
    namespace,
    meta: await getPluginMeta(__filename),
  };
}

export async function run(pargv: string[], env: { [k: string]: string; }) {
  const now = new Date();
  let err: any;
  let ienv: IonicEnvironment;

  pargv = modifyArguments(pargv.slice(2));
  env['IONIC_CLI_LIB'] = __filename;

  const { isSuperAgentError } = await import('@ionic/cli-utils/guards');
  const { isValidationErrorArray } = await import('@ionic/cli-framework/guards');

  const plugin = await generateRootPlugin();

  try {
    ienv = await generateIonicEnvironment(plugin, pargv, env);
  } catch (e) {
    console.error(e.message ? e.message : (e.stack ? e.stack : e));
    process.exitCode = 1;
    return;
  }

  try {
    const config = await ienv.config.load();

    ienv.log.debug(() => util.inspect(ienv.meta, { breakLength: Infinity, colors: chalk.enabled }));

    if (env['IONIC_EMAIL'] && env['IONIC_PASSWORD']) {
      ienv.log.debug(() => `${chalk.bold('IONIC_EMAIL')} / ${chalk.bold('IONIC_PASSWORD')} environment variables detected`);

      if (config.user.email !== env['IONIC_EMAIL']) {
        ienv.log.debug(() => `${chalk.bold('IONIC_EMAIL')} mismatch with current session--attempting login`);

        try {
          await ienv.session.login(env['IONIC_EMAIL'], env['IONIC_PASSWORD']);
        } catch (e) {
          ienv.log.error(`Error occurred during automatic login via ${chalk.bold('IONIC_EMAIL')} / ${chalk.bold('IONIC_PASSWORD')} environment variables.`);
          throw e;
        }
      }
    }

    if (ienv.project.directory) {
      const nodeModulesExists = await pathExists(path.join(ienv.project.directory, 'node_modules'));

      if (!nodeModulesExists) {
        const confirm = await ienv.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `Looks like a fresh checkout! No ${chalk.green('./node_modules')} directory found. Would you like to install project dependencies?`,
        });

        if (confirm) {
          ienv.log.info('Installing dependencies may take several minutes!');
          const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');
          const [ installer, ...installerArgs ] = await pkgManagerArgs(ienv, { command: 'install' });
          await ienv.shell.run(installer, installerArgs, {});
        }
      }
    }

    const argv = parseArgs(pargv, { boolean: true, string: '_' });

    // If an legacy command is being executed inform the user that there is a new command available
    const foundCommand = mapLegacyCommand(argv._[0]);
    if (foundCommand) {
      ienv.log.msg(`The ${chalk.green(argv._[0])} command has been renamed. To find out more, run:\n\n` +
                   `  ${chalk.green(`ionic ${foundCommand} --help`)}\n\n`);
    } else {
      const { loadPlugins } = await import ('@ionic/cli-utils/lib/plugins');

      try {
        await loadPlugins(ienv);
      } catch (e) {
        if (e.fatal) {
          throw e;
        }

        ienv.log.error(chalk.red.bold('Error occurred while loading plugins. CLI functionality may be limited.'));
        ienv.log.debug(() => chalk.red(chalk.bold('Plugin error: ') + (e.stack ? e.stack : e)));
      }

      if (ienv.flags.interactive && config.daemon.enabled) {
        const { checkForDaemon } = await import('@ionic/cli-utils/lib/daemon');
        await checkForDaemon(ienv);
      }

      await ienv.hooks.fire('plugins:init', { env: ienv });
      await namespace.runCommand(ienv, pargv);
      config.state.lastCommand = now.toISOString();
    }

    const updateNotifier = await import('update-notifier');
    updateNotifier({ pkg: plugin.meta.pkg }).notify();

  } catch (e) {
    err = e;
  }

  try {
    await Promise.all([
      ienv.config.save(),
      ienv.project.save(),
      ienv.daemon.save(),
    ]);
  } catch (e) {
    ienv.log.error(String(e.stack ? e.stack : e));
  }

  if (err) {
    ienv.tasks.fail();
    process.exitCode = 1;

    if (isValidationErrorArray(err)) {
      for (let e of err) {
        ienv.log.error(e.message);
      }
      ienv.log.msg(`Use the ${chalk.green('--help')} flag for more details.`);
    } else if (isSuperAgentError(err)) {
      const { formatSuperAgentError } = await import('@ionic/cli-utils/lib/http');
      ienv.log.msg(formatSuperAgentError(err));
    } else if (err.code && err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      ienv.log.error(
        `Network connectivity error occurred, are you offline?\n` +
        `If you are behind a firewall and need to configure proxy settings, see: ${chalk.bold('https://ionicframework.com/docs/cli/configuring.html#using-a-proxy')}\n\n` +
        chalk.red(String(err.stack ? err.stack : err))
      );
    } else if (isExitCodeException(err)) {
      process.exitCode = err.exitCode;

      if (err.message) {
        if (err.exitCode > 0) {
          ienv.log.error(err.message);
        } else {
          ienv.log.msg(err.message);
        }
      }
    } else if (err instanceof Exception) {
      ienv.log.error(err.message);
    } else {
      ienv.log.msg(chalk.red(String(err.stack ? err.stack : err)));

      if (err.stack) {
        ienv.log.debug(() => chalk.red(String(err.stack)));
      }
    }
  }

  await ienv.close();
}
