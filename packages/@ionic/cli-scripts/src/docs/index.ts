import * as path from 'path';

import { generateRootPlugin } from 'ionic';
import { Command } from '@ionic/cli-framework';
import { copyDirectory, fsMkdirp, fsReadDir, fsStat, fsWriteFile } from '@ionic/cli-framework/utils/fs';
import { generateIonicEnvironment } from '@ionic/cli-utils';

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
