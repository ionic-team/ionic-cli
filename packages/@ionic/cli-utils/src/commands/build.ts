import { CommandLineInputs, CommandLineOptions, IonicEnvironment } from '../definitions';

export async function build(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  await env.hooks.fire('build:before', { env });

  const project = await env.project.load();

  if (project.type === 'ionic-angular') {
    const { build } = await import('../lib/ionic-angular/build');
    await build({ env, options });
  }

  await env.hooks.fire('build:after', { env });
}
