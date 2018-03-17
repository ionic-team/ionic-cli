import * as path from 'path';

import chalk from 'chalk';

import { Command, CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-framework';
import { copyDirectory, fsMkdirp, fsReadDir, fsStat, fsWriteFile } from '@ionic/cli-framework/utils/fs';
import { prettyPath } from '@ionic/cli-framework/utils/format';

import { IonicEnvironment, generateIonicEnvironment } from '@ionic/cli-utils';
import { generateRootPlugin } from 'ionic';

import { formatCommandDoc, generateFullName, getCommandList } from './pages/commands';

export class DocsCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'docs',
      description: '',
      options: [
        {
          name: 'new',
          description: `Generate docs for the new ${chalk.bold('ionic-docs')} repo`,
          type: Boolean,
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    const newDocs = options['new'] ? true : false;

    const plugin = await generateRootPlugin();
    const env = await generateIonicEnvironment(plugin, process.argv.slice(2), process.env);

    if (newDocs) {
      await this.generateNewDocs(env);
    } else {
      await this.generateOldDocs(env);
    }

    env.close();

    process.stdout.write(`${chalk.green('Done.')}\n`);
  }

  async generateNewDocs(env: IonicEnvironment) {
    // const commands = await getCommandList(env);

    // for (const command of commands) {
    // }
  }

  async generateOldDocs(env: IonicEnvironment) {
    const mdPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs');
    const pagesDir = path.resolve(__dirname, 'pages');
    const pages = (await fsReadDir(pagesDir)).filter(f => path.extname(f) === '.js').map(f => path.resolve(pagesDir, f)); // dist/docs/pages/*.js

    await fsMkdirp(mdPath);

    for (const p of pages) {
      const name = path.basename(p).slice(0, -path.extname(p).length);
      const render = require(p).default;
      const pageMdPath = path.resolve(mdPath, `${name}.md`);
      const renderedPage = await render(env);
      await fsWriteFile(pageMdPath, renderedPage, { encoding: 'utf8' });
    }

    const commands = await getCommandList(env);
    const commandPromises = commands.map(async cmd => {
      const fullName = await generateFullName(cmd);
      const cmdPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', ...fullName.split(' '), 'index.md');
      const cmdDoc = await formatCommandDoc(env, cmd);

      await fsMkdirp(path.dirname(cmdPath));
      await fsWriteFile(cmdPath, cmdDoc, { encoding: 'utf8' });
    });

    await Promise.all(commandPromises);
    await this.copyToIonicSite();
  }

  async copyToIonicSite() {
    const ionicSitePath = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'ionic-site');

    const dirData = await fsStat(ionicSitePath);
    if (!dirData.size) {
      // ionic-site not present
      process.stderr.write(`${chalk.red('ERROR: ionic-site repo not found')}\n`);
      return;
    }

    const srcDir = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs');
    const destDir = path.resolve(ionicSitePath, 'content', 'docs', 'cli');

    await copyDirectory(srcDir, destDir);

    process.stdout.write(`${chalk.green(`Docs written to ${chalk.bold(prettyPath(destDir))}.`)}\n`);
  }
}
