import chalk from 'chalk';
import * as Debug from 'debug';

import { CommandLineInputs, CommandLineOptions, IonicEnvironment } from '../definitions';
import { BUILD_AFTER_HOOK, BUILD_AFTER_SCRIPT, BUILD_BEFORE_HOOK, BUILD_BEFORE_SCRIPT } from '../lib/build';
import { FatalException } from '../lib/errors';
import { PROJECT_FILE } from '../lib/project';

const debug = Debug('ionic:cli-utils:commands:build');

export async function build(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  const { pkgManagerArgs } = await import('../lib/utils/npm');
  const [ platform ] = inputs;

  const pkg = await env.project.loadPackageJson();

  debug(`Looking for ${chalk.cyan(BUILD_BEFORE_SCRIPT)} npm script.`);

  if (pkg.scripts && pkg.scripts[BUILD_BEFORE_SCRIPT]) {
    debug(`Invoking ${chalk.cyan(BUILD_BEFORE_SCRIPT)} npm script.`);
    const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(env, { command: 'run', script: BUILD_BEFORE_SCRIPT });
    await env.shell.run(pkgManager, pkgArgs, { showExecution: true });
  }

  const assign = await import('lodash/assign');
  const deps = assign({}, pkg.dependencies, pkg.devDependencies);

  if (deps['@ionic/cli-plugin-cordova']) {
    const { checkCordova } = await import('../lib/cordova/utils');
    await checkCordova(env);
  }

  await env.hooks.fire(BUILD_BEFORE_HOOK, { env });

  const project = await env.project.load();

  if (project.type === 'ionic1') {
    const { build } = await import('../lib/ionic1/build');
    await build({ env, options: { platform, ...options } });
  } else if (project.type === 'ionic-angular') {
    const { build } = await import('../lib/ionic-angular/build');
    await build({ env, options: { platform, ...options } });
  } else if (project.type === 'ionic-core-angular') {
    const { build } = await import('../lib/ionic-core-angular/build');
    await build({ env, options: { platform, ...options } });
  } else {
    throw new FatalException(
      `Cannot perform Ionic build for project type: ${chalk.bold(project.type)}.\n` +
      (project.type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to build custom projects.\n\n` : '') +
      `If you'd like the CLI to try to detect your project type, you can unset the ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)}.`
    );
  }

  debug(`Looking for ${chalk.cyan(BUILD_AFTER_SCRIPT)} npm script.`);

  if (pkg.scripts && pkg.scripts[BUILD_AFTER_SCRIPT]) {
    debug(`Invoking ${chalk.cyan(BUILD_AFTER_SCRIPT)} npm script.`);
    const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(env, { command: 'run', script: BUILD_AFTER_SCRIPT });
    await env.shell.run(pkgManager, pkgArgs, { showExecution: true });
  }

  await env.hooks.fire(BUILD_AFTER_HOOK, { env, platform });
}
