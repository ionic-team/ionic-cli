import { CommServer, Publisher as BasePublisher } from '@ionic/discover';

export { computeBroadcastAddress } from '@ionic/discover';

export class Publisher extends BasePublisher {
  protected getInterfaces() {
    return [];
  }
}

export async function createPublisher(name: string, port: number, commPort: number) {
  const publisher = new Publisher('devapp', `${name}@${port}`, port, commPort);
  return publisher;
}

export async function createCommServer(id: string, port: number) {
  return new CommServer('devapp', id, port);
}
