import * as path from 'path';

import * as chalk from 'chalk';

import {
  DeployChannel,
  DeploySnapshotRequest,
  IonicEnvironment,
} from '../definitions';

export async function upload(env: IonicEnvironment, { note, channelTag, metadata }: { note?: string, channelTag?: string, metadata?: Object}): Promise<DeploySnapshotRequest> {
  const { createArchive } = await import('./utils/archive');
  const { DeployClient } = await import('./deploy');

  let channel: DeployChannel | undefined;

  const token = await env.session.getAppUserToken();
  const deploy = new DeployClient(token, env.client);

  if (channelTag) {
    env.tasks.next('Retrieving deploy channel');
    channel = await deploy.getChannel(channelTag);
  }

  const wwwPath = path.join(env.project.directory, 'www'); // TODO don't hardcode
  const zip = createArchive('zip');
  zip.directory(wwwPath, '/');
  zip.finalize();

  env.tasks.next('Requesting snapshot upload');
  const snapshot = await deploy.requestSnapshotUpload({ note, user_metadata: metadata });
  const uploadTask = env.tasks.next('Uploading snapshot');
  await deploy.uploadSnapshot(snapshot, zip, (loaded, total) => {
    uploadTask.progress(loaded, total);
  });

  env.tasks.end();
  env.log.ok(`Uploaded snapshot ${chalk.bold(snapshot.uuid)}!`);

  if (channel) {
    env.tasks.next(`Deploying to '${channel.tag}' channel`);
    await deploy.deploy(snapshot.uuid, channel.uuid);
    env.tasks.end();
    env.log.ok(`Deployed snapshot ${chalk.bold(snapshot.uuid)} to channel ${chalk.bold(channel.tag)}!`);
  }

  return snapshot;
}
