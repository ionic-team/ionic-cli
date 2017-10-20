import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, DistTag } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { fsUnlink } from '@ionic/cli-framework/utils/fs';
import { FatalException } from '@ionic/cli-utils/lib/errors';

@CommandMetadata({
  name: 'daemon',
  type: 'global',
  description: 'Ionic update checker daemon',
  options: [
    {
      name: 'interval',
      description: 'Interval, in seconds, to check for updates',
      default: '900',
    },
    {
      name: 'kill-existing',
      description: 'If an existing daemon is found, force kill it',
      type: Boolean,
    },
  ],
  visible: false,
})
export class DaemonCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { prettyPath } = await import('@ionic/cli-utils/lib/utils/format');
    const { createCommServer, processRunning } = await import('@ionic/cli-utils/lib/daemon');
    const { pkgLatestVersion } = await import('@ionic/cli-utils/lib/utils/npm');
    const { findClosestOpenPort } = await import('@ionic/cli-utils/lib/utils/network');
    const { determineDistTag, versionNeedsUpdating } = await import('@ionic/cli-utils/lib/plugins');
    const { registerShutdownFunction } = await import('@ionic/cli-utils/lib/process');

    const updateInterval = Number(options.interval);
    const killExisting = options['kill-existing'];
    const config = await this.env.config.load();

    if (!config.daemon.updates) {
      throw new FatalException('Daemon is disabled in config.');
    }

    const f = await this.env.daemon.getPid();
    const d = await this.env.daemon.load();

    d.daemonVersion = this.env.plugins.ionic.meta.version;
    const daemonDistTag = determineDistTag(this.env.plugins.ionic.meta.version);

    let latestIonicVersion = this.env.plugins.ionic.meta.latestVersion;

    if (!latestIonicVersion) {
      latestIonicVersion = await pkgLatestVersion(this.env, 'ionic', daemonDistTag);

      if (!latestIonicVersion) {
        throw new FatalException('Could not get latest version of ionic.');
      }

      this.env.daemon.populateDistTag(daemonDistTag);
      d.latestVersions[daemonDistTag]['ionic'] = latestIonicVersion;
    }

    await this.env.daemon.save();

    if (f) {
      this.env.log.info(`Daemon pid file found: ${chalk.bold(prettyPath(this.env.daemon.pidFilePath))}`);

      if (killExisting) {
        this.env.log.info(`Killing existing daemon process ${chalk.bold(String(f))}.`);
        await fsUnlink(this.env.daemon.pidFilePath);
        try {
          process.kill(Number(f));
        } catch (e) {
          if (e.code !== 'ESRCH') {
            throw e;
          }
        }
      } else if (!processRunning(f)) {
        this.env.log.info(`Process ${chalk.bold(String(f))} not found, deleting pid file.`);
        await fsUnlink(this.env.daemon.pidFilePath);
      } else {
        this.env.log.info('Daemon already running and up-to-date.');
        return;
      }
    }

    this.env.log.info(`Writing ${chalk.bold(String(process.pid))} to daemon pid file (${chalk.bold(prettyPath(this.env.daemon.pidFilePath))}).`);
    await this.env.daemon.setPid(process.pid);

    const commServerHost = 'localhost';
    const commServerPort = await findClosestOpenPort(53818, commServerHost);
    this.env.log.info(`Spinning up communication server on port ${chalk.bold(String(commServerPort))}.`);
    const commServer = await createCommServer(this.env);

    commServer.listen(commServerPort, commServerHost);

    this.env.log.info(`Writing ${chalk.bold(String(commServerPort))} to daemon port file (${chalk.bold(prettyPath(this.env.daemon.portFilePath))}).`);
    await this.env.daemon.setPort(commServerPort);

    const updateFn = async () => {
      const config = await this.env.config.load({ disk: true });
      const f = await this.env.daemon.getPid();
      const d = await this.env.daemon.load({ disk: true });

      if (!f) {
        this.env.log.info(`Daemon shutting down--pid file missing.`);
        return process.exit();
      } else if (f !== process.pid) {
        this.env.log.info(`Daemon shutting down--mismatch with pid file. (${chalk.bold(String(f))} vs ${chalk.bold(String(process.pid))})`);
        return process.exit();
      } else if (!config.daemon.updates) {
        this.env.log.info(`Daemon shutting down--daemon was disabled.`);
        return process.exit();
      } else if (daemonDistTag !== determineDistTag(config.version)) {
        this.env.log.info(`Daemon shutting down--dist-tag mismatch. (${chalk.bold(d.daemonVersion)} vs ${chalk.bold(config.version)})`);
        return process.exit();
      } else if (await versionNeedsUpdating(d.daemonVersion, config.version)) {
        this.env.log.info(`Daemon shutting down--out-of-date. (${chalk.bold(d.daemonVersion)} vs ${chalk.bold(config.version)})`);
        return process.exit();
      }

      for (let distTag in d.latestVersions) {
        const pkgs = Object.keys(d.latestVersions[distTag]);
        const pkgUpdates = await Promise.all(pkgs.map(pkg => pkgLatestVersion(this.env, pkg, <DistTag>distTag)));

        for (let i in pkgUpdates) {
          d.latestVersions[distTag][pkgs[i]] = pkgUpdates[i] || '';
        }
      }

      this.env.log.info('Writing daemon file.');
      await this.env.daemon.save();
    };

    registerShutdownFunction(this.env, () => {
      const fs = require('fs');

      try {
        fs.unlinkSync(this.env.daemon.pidFilePath);
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }

      try {
        fs.unlinkSync(this.env.daemon.portFilePath);
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    });

    const delayMs = 5 * 1000; // wait 5 seconds before doing first check
    const updateIntervalMs = updateInterval * 1000; // check every interval

    setTimeout(async () => {
      await updateFn();
      setInterval(updateFn, updateIntervalMs);
    }, delayMs);
  }
}
