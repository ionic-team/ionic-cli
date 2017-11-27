import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, IonicEnvironment } from '../definitions';

const BUILD_BEFORE_HOOK = 'build:before';
const BUILD_BEFORE_SCRIPT = `ionic:${BUILD_BEFORE_HOOK}`;
const BUILD_AFTER_HOOK = 'build:after';
const BUILD_AFTER_SCRIPT = `ionic:${BUILD_AFTER_HOOK}`;

export async function build(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  const { detectAndWarnAboutDeprecatedPlugin } = await import('../lib/plugins');

  const [ platform ] = inputs;
  const packageJson = await env.project.loadPackageJson();

  if (packageJson.scripts && packageJson.scripts[BUILD_BEFORE_SCRIPT]) {
    env.log.debug(() => `Invoking ${chalk.cyan(BUILD_BEFORE_SCRIPT)} npm script.`);
    await env.shell.run('npm', ['run', BUILD_BEFORE_SCRIPT], { showExecution: true });
  }

  const assign = await import('lodash/assign');
  const deps = assign({}, packageJson.dependencies, packageJson.devDependencies);

  if (deps['gulp']) {
    const { checkAndEnableGulpIntegration, runTask } = await import('../lib/gulp');
    await checkAndEnableGulpIntegration(env);
    await runTask(env, BUILD_BEFORE_SCRIPT);
  }

  await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-cordova');
  await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-ionic-angular');
  await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-ionic1');
  await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-gulp');

  if (deps['@ionic/cli-plugin-cordova']) {
    const { checkCordova } = await import('../lib/cordova/utils');
    await checkCordova(env);
  }

  await env.hooks.fire(BUILD_BEFORE_HOOK, { env });

  const project = await env.project.load();

  if (project.type === 'ionic-angular') {
    const { build } = await import('../lib/ionic-angular/build');
    await build({ env, options: { platform, ...options } });
  } else {
    const { build } = await import('../lib/ionic1/build');
    await build({ env, options: { platform, ...options } });
  }

  if (packageJson.scripts && packageJson.scripts[BUILD_AFTER_SCRIPT]) {
    env.log.debug(() => `Invoking ${chalk.cyan(BUILD_AFTER_SCRIPT)} npm script.`);
    await env.shell.run('npm', ['run', BUILD_AFTER_SCRIPT], { showExecution: true });
  }

  if (deps['gulp']) {
    const { checkAndEnableGulpIntegration, runTask } = await import('../lib/gulp');
    await checkAndEnableGulpIntegration(env);
    await runTask(env, BUILD_AFTER_SCRIPT);
  }

  await env.hooks.fire(BUILD_AFTER_HOOK, { env, platform });
}
