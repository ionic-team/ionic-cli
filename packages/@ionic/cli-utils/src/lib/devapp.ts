import { IonicEnvironment } from '../definitions';

import { Publisher as BasePublisher } from '@ionic/discover';

export { computeBroadcastAddress } from '@ionic/discover';

export class Publisher extends BasePublisher {
  getInterfaces() {
    return [];
  }
}

export async function createPublisher(env: IonicEnvironment, port: number) {
  const project = await env.project.load();
  const publisher = new Publisher('devapp', `${project.name}@${port}`, port);
  publisher.path = '/?devapp=true';

  return publisher;
}
