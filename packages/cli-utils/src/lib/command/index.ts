import { CommandData } from '../../definitions';

export function CommandMetadata(metadata: CommandData) {
  return function(target: Function) {
    target.prototype.metadata = metadata;
  };
}
