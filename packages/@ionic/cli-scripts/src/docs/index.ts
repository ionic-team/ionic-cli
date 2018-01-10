import * as path from 'path';

import { generateRootPlugin } from 'ionic';
import { Command } from '@ionic/cli-framework';
import { copyDirectory, fsMkdirp, fsStat, fsWriteFile } from '@ionic/cli-framework/utils/fs';

import { generateIonicEnvironment } from '@ionic/cli-utils';

import formatIndexPage from './pages/index';
import formatConfiguringPage from './pages/configuring';
import formatCommandsPage from './pages/commands';
import formatStartersPage from './pages/starters';
import { formatCommandDoc, generateFullName, getCommandList } from './pages/commands';

export class DocsCommand extends Command {
  async getMetadata() {
    return {
      name: 'docs',
      description: '',
    };
  }

  async run() {
    const plugin = await generateRootPlugin();
    const env = await generateIonicEnvironment(plugin, process.argv.slice(2), process.env);

    const indexPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'index.md');
    const indexDoc = await formatIndexPage(env);

    const commandsPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'commands.md');
    const commandsDoc = await formatCommandsPage(env);

    const configuringPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'configuring.md');
    const configuringDoc = await formatConfiguringPage();

    const startersPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'starters.md');
    const startersDoc = await formatStartersPage();

    await fsMkdirp(path.dirname(indexPath));

    await fsWriteFile(indexPath, indexDoc, { encoding: 'utf8' });
    await fsWriteFile(commandsPath, commandsDoc, { encoding: 'utf8' });
    await fsWriteFile(configuringPath, configuringDoc, { encoding: 'utf8' });
    await fsWriteFile(startersPath, startersDoc, { encoding: 'utf8' });

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

    env.close();
  }

  async copyToIonicSite() {
    const ionicSitePath = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'ionic-site');

    let dirData = await fsStat(ionicSitePath);
    if (!dirData.size) {
      // ionic-site not present
      process.stderr.write('ionic-site repo not found\n');
      return;
    }

    return copyDirectory(
      path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs'),
      path.resolve(ionicSitePath, 'content', 'docs', 'cli')
    );
  }
}
