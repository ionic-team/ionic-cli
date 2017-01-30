import { CloudConfigFile } from '../definitions';

export function formatGitRepoUrl(configFile: CloudConfigFile, app_id: string) {
  return `git@${configFile.git.host}:${app_id}.git`;
}
