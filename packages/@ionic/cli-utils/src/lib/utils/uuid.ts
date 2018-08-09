import * as uuidv4 from 'uuid/v4';

export function generateUUID(): string {
  return uuidv4().toString();
}

export function shortid(): string {
  return generateUUID().substring(0, 8);
}
