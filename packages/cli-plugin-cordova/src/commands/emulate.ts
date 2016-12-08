import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata
} from '@ionic/cli';

/**
 * Metadata about the emulate command
 */
@CommandMetadata({
  name: 'emulate',
  description: 'Emulate an Ionic project on a simulator or emulator',
  inputs: [
    {
      name: 'platform',
      description: 'the platform to emulate',
    }
  ],
  options: [
    {
      name: 'livereload',
      description: 'Live reload app dev files from the device',
      type: Boolean,
      aliases: ['l']
    },
    {
      name: 'address',
      description: 'Use specific address (livereload req.)',
      default: '0.0.0.0'
    },
    {
      name: 'consolelogs',
      description: 'Print app console logs to Ionic CLI',
      type: Boolean,
      aliases: ['c']
    },
    {
      name: 'serverlogs',
      description: 'Print dev server logs to Ionic CLI',
      type: Boolean,
      aliases: ['s']
    },
    {
      name: 'port',
      description: 'Dev server HTTP port (8100 default)',
      default: '8100',
      aliases: ['p']
    },
    {
      name: 'livereload-port',
      description: 'Live Reload port (35729 default)',
      default: '35729',
      aliases: ['r']
    },
    {
      name: 'debug|--release',
      description: '',
      type: Boolean,
    },
    {
      name: 'device|--emulator|--target=FOO',
      description: ''
    }
  ],
  isProjectTask: true
})
export class EmulateCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg('emulate');
  }
}
