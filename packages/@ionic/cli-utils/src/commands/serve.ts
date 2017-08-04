import { CommandLineInputs, CommandLineOptions, IonicEnvironment, ServeDetails } from '../definitions';

export async function serve(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions) {
  await env.hooks.fire('watch:before', { env });

  const serveOptions = {
    env,
    options: {
      ...options,
      externalIpRequired: options.broadcast,
    },
  };

  let serverDetails: ServeDetails | undefined;

  const project = await env.project.load();

  if (project.type === 'ionic1') {
    const { serve } = await import('../lib/ionic1/serve');
    serverDetails = await serve(serveOptions);
  } else if (project.type === 'ionic-angular') {
    const { serve } = await import('../lib/ionic-angular/serve');
    serverDetails = await serve(serveOptions);
  } else {
    throw new Error('Unknown project.'); // TODO
  }

  return serverDetails;
}
