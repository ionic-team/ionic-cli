# Ionic Discover

Simple UDP based protocol for service discovery implemented in pure JS. It is
not mDNS or bonjour, but it tries to accomplish the same thing.

## Spec

It uses a JSON based textual format:

```ts
const message = {
  t: now,
  id: 'unique',
  name: this.name,
  host: os.hostname(),
  ip: iface.address,
  port: number1,
  commPort: number2
};

return 'ION_DP' + JSON.stringify(message);
```

| key        | description
|------------|-------------
| `t`        | unix timestamp in second
| `id`       | unique id for this session
| `name`     | name of the announced service
| `host`     | hostname of the machine announcing the service
| `ip`       | ipv4 address
| `port`     | tcp port of the announced service
| `commPort` | optional websocket port of the communication server

## Installation

```
npm install @ionic/discover
```

## Usage

```ts
import { Publisher } from '@ionic/discover';

const namespace = 'your-service';
const serviceName = 'Ionic thing!';
const tcpPort = 8100;
const service = new Publisher(namespace, serviceName, tcpPort);

await service.start();
```
