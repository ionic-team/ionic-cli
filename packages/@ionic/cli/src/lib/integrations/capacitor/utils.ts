import { CommandLineInputs, CommandLineOptions } from '../../../definitions';

export function generateOptionsForCapacitorBuild(inputs: CommandLineInputs, options: CommandLineOptions): CommandLineOptions {
  const [ platform ] = inputs;

  return {
    ...options,
    externalAddressRequired: true,
    open: false,
    engine: 'capacitor',
    platform: platform ? platform : (options['platform'] ? String(options['platform']) : undefined),
  };
}

export function getNativeIDEForPlatform(platform: string): string {
  switch (platform) {
    case 'ios':
      return 'Xcode';
    case 'android':
      return 'Android Studio';
  }

  return 'Native IDE';
}

export function getVirtualDeviceNameForPlatform(platform: string): string {
  switch (platform) {
    case 'ios':
      return 'simulator';
    case 'android':
      return 'emulator';
  }

  return 'virtual device';
}
