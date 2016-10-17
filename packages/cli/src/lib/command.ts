import { CommandData, CommandEnvironment } from '../definitions';

export function CommandMetadata(metadata: CommandData) {
  return function (target: Function) {
    target.prototype.metadata = metadata;
  };
}

export class Command {
  public env: CommandEnvironment;
  public metadata: CommandData;
}
