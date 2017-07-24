import * as uuid from 'uuid';

export function generateUUID(): string {
  return uuid.v4().toString();
}
