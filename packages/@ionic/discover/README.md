# Ionic Discover

Simple UDP based protocol for service discovery implemented in pure JS. It is not mDNS or bonjour, but it tries to accomplish the same thing.

## Spec

It uses a JSON based textual format:

```ts
const message = {
  t: now,
  id: this.id,
  name: this.name,
  host: os.hostname(),
  ip: iface.address,
  port: this.port
};
return 'ION_DP' + JSON.stringify(message);
```

- t: unix timestamp in second
- id: unique id for this session
- name: name of the announced service
- host: hostname of the machine announcing the service
- ip: ipv4 address
- port: tcp port of the announced service

## Why?

Complexity of mDNS and lack of good pure JS implementations. We tried different NPM packages that
implemented mDNS, ZeroConf or Bonjour but non of them worked for us:

- mdns: it worked very realiably, but required compiling C code with dependencies. It required complicated and different instructions steps for osx, windows and linux
- node-bonjour: buggy
- node-mdns: buggy

We were in a dead end road with the approach and trying to reimplement mDNS by our own was completely out of scope.

## Installation

```
npm install @ionic/discover --save
```

## Usage

```
const Publisher = require('@ionic/discover').Publisher;
const serviceName = 'Ionic thing!';
const tcpPort = 8100;
const service = new Publisher(serviceName, tcpPort);
service.start();
```
