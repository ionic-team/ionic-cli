import { CommandLineInputs, CommandLineOptions, Command, CommandMetadata } from '@ionic/cli-utils';
import { getIonitronString, ionitronStatements } from '../lib/ionitron';

@CommandMetadata({
  name: 'ionitron',
  unlisted: true,
  description: 'Print random ionitron messages',
  options: [
    {
      name: 'es',
      description: 'Print in spanish',
      type: Boolean,
    }
  ]
})
export class IonitronCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const locale = options['es'] ? 'es' : 'en';
    const localeStatements = ionitronStatements[locale];
    let str = [
    '41 77 77 77 2e 2e 2e 73 6e 61 70 21 20 59 6f 75 20 66 6f 75 6e 64 20 74 68 65 20 68 69 64 64 65 6e 20 66 65 61 74 75 72 65 20 61 6e 64 20 6d 69 67 68 74 20 67 65 74',
    '73 6f 6d 65 20 67 6f 6f 64 69 65 73 20 66 6f 72 20 74 68 65 20 68 6f 6c 69 64 61 79 21 20 53 65 6e 64 20 61 6e 20 65 6d 61 69 6c 20 74 6f',
    '22 62 64 65 61 6e 2b 63 6c 69 2d 65 61 73 74 65 72 2d 65 67 67 2d 68 75 6e 74 40 69 6f 6e 69 63 2e 69 6f 22 2c 20 61 6e 64 20 69 6e 63 6c 75 64 65 20 79 6f 75 72 3a',
    '46 75 6c 6c 20 4e 61 6d 65 2c 20 4d 61 69 6c 69 6e 67 20 41 64 64 72 65 73 73 2c 20 50 68 6f 6e 65 20 4e 75 6d 62 65 72 2c 20 61 6e 64 20 2a 61 74 74 61 63 68',
    '61 20 73 63 72 65 65 6e 73 68 6f 74 20 6f 66 20 6d 65 20 61 6e 64 20 74 68 69 73 20 6d 65 73 73 61 67 65 2a 2e 20 49 66 20 79 6f 75 27 72 65 20 6f 6e 65 20 6f 66',
    '74 68 65 20 66 69 72 73 74 20 32 30 20 64 65 76 65 6c 6f 70 65 72 73 20 74 6f 20 73 65 6e 64 20 74 68 65 20 63 6f 6d 70 6c 65 74 65 20 65 6d 61 69 6c 2c',
    '79 6f 75 20 67 65 74 20 61 20 70 72 69 7a 65 2e'
    ];

    let statement;
    let b = 1492021741555 + 1000000000;

    if (Date.now() < b) {
      statement = str.map(s => new Buffer(s.replace(/ /g, ''), 'hex').toString()).join('\n');
    } else {
      statement = localeStatements[Math.floor(Math.random() * (localeStatements.length))];
    }

    this.env.log.msg(getIonitronString(statement));
  }
}
