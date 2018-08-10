import { CommandLineInputs, CommandLineOptions } from '../../../definitions';

export function generateOptionsForCapacitorBuild(inputs: CommandLineInputs, options: CommandLineOptions): CommandLineOptions {
  const [ platform ] = inputs;

  return {
    ...options,
    externalAddressRequired: true,
    engine: 'capacitor',
    platform: platform ? platform : (options['platform'] ? String(options['platform']) : undefined),
  };
}
