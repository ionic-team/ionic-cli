import * as os from 'os';

import chalk from 'chalk';
import { str2num } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, IonicEnvironment, ServeDetails } from '../definitions';
import { FatalException } from '../lib/errors';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, DEFAULT_SERVER_PORT, IONIC_LAB_URL, gatherDevAppDetails, publishDevApp } from '../lib/serve';

export async function serve(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions): Promise<ServeDetails> {
  await env.hooks.fire('watch:before', { env });

  const [ platform ] = inputs;

  let details: ServeDetails;
  const serveOptions = cliOptionsToServeOptions(options);

  const project = await env.project.load();

  const devAppDetails = await gatherDevAppDetails(env, serveOptions);

  if (project.type === 'ionic1') {
    const { serve } = await import('../lib/ionic1/serve');
    details = await serve({ env, options: serveOptions });
  } else if (project.type === 'ionic-angular') {
    const { serve } = await import('../lib/ionic-angular/serve');
    details = await serve({ env, options: {
      platform,
      target: serveOptions.iscordovaserve ? 'cordova' : undefined,
      ...serveOptions,
    }});
  } else {
    throw new FatalException(
      `Cannot perform Ionic serve/watch for project type: ${chalk.bold(project.type)}.\n` +
      (project.type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to serve custom projects.\n\n` : '') +
      `If you'd like the CLI to try to detect your project type, you can unset the ${chalk.bold('type')} attribute in ${chalk.bold('ionic.config.json')}.\n`
    );
  }

  if (devAppDetails) {
    const devAppName = await publishDevApp(env, serveOptions, { port: details.port, ...devAppDetails });
    devAppDetails.channel = devAppName;
  }

  const localAddress = `http://localhost:${details.port}`;
  const fmtExternalAddress = (address: string) => `http://${address}:${details.port}`;

  env.log.ok(
    `Development server running!\n` +
    `Local: ${chalk.bold(localAddress)}\n` +
    (details.externalNetworkInterfaces.length > 0 ? `External: ${details.externalNetworkInterfaces.map(v => chalk.bold(fmtExternalAddress(v.address))).join(', ')}\n` : '') +
    (serveOptions.basicAuth ? `Basic Auth: ${chalk.bold(serveOptions.basicAuth[0])} / ${chalk.bold(serveOptions.basicAuth[1])}` : '') +
    (devAppDetails && devAppDetails.channel ? `DevApp: ${chalk.bold(devAppDetails.channel)} on ${chalk.bold(os.hostname())}` : '')
  );

  if (serveOptions.open) {
    const openOptions: string[] = [localAddress]
      .concat(serveOptions.lab ? [IONIC_LAB_URL] : [])
      .concat(serveOptions.browserOption ? [serveOptions.browserOption] : [])
      .concat(platform ? ['?ionicplatform=', platform] : []);

    const opn = await import('opn');
    opn(openOptions.join(''), { app: serveOptions.browser, wait: false });
  }

  return details;
}

export function cliOptionsToServeOptions(options: CommandLineOptions) {
  if (options['local']) {
    options['address'] = 'localhost';
    options['devapp'] = false;
  }

  const address = options['address'] ? String(options['address']) : BIND_ALL_ADDRESS;
  const port = str2num(options['port'], DEFAULT_SERVER_PORT);
  const livereloadPort = str2num(options['livereload-port'], DEFAULT_LIVERELOAD_PORT);
  const notificationPort = str2num(options['dev-logger-port'], DEFAULT_DEV_LOGGER_PORT);

  return {
    address,
    port,
    livereloadPort,
    notificationPort,
    consolelogs: options['consolelogs'] ? true : false,
    serverlogs: options['serverlogs'] ? true : false,
    livereload: typeof options['livereload'] === 'boolean' ? Boolean(options['livereload']) : true,
    proxy: typeof options['proxy'] === 'boolean' ? Boolean(options['proxy']) : true,
    lab: options['lab'] ? true : false,
    open: options['open'] ? true : false,
    browser: options['browser'] ? String(options['browser']) : undefined,
    browserOption: options['browseroption'] ? String(options['browseroption']) : undefined,
    basicAuth: options['auth'] ? <[string, string]>['ionic', String(options['auth'])] : undefined, // TODO: typescript can't infer tuple
    env: options['env'] ? String(options['env']) : undefined,
    devapp: typeof options['devapp'] === 'undefined' || options['devapp'] ? true : false,
    externalAddressRequired: options['externalAddressRequired'] ? true : false,
    iscordovaserve: typeof options['iscordovaserve'] === 'boolean' ? Boolean(options['iscordovaserve']) : false,
  };
}
