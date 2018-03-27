# CLI Framework, by Ionic

The foundation framework of the Ionic CLI.

## Getting Started

`index.js`:
```js
const { Command, CommandMap, Namespace, execute } = require('@ionic/cli-framework');

class VersionCommand extends Command {
  async getMetadata() {
    return {
      name: 'version',
      summary: 'Print CLI version',
    };
  }

  async run() {
    console.log('1.0.0');
  }
}

class RootNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'mynewcli',
      summary: 'A cool CLI that prints its own version',
    };
  }

  async getCommands() {
    return new CommandMap([['version', async () => new VersionCommand(this)]]);
  }
}

module.exports = async function(argv, env) {
  await execute({ namespace: new RootNamespace(), argv, env });
}
```

`bin/mynewcli`:
```javascript
#!/usr/bin/env node

const run = require('../');
run(process.argv.slice(2), process.env);
```

command line:

```bash
$ ./bin/mynewcli
$ ./bin/mynewcli version
$ ./bin/mynewcli version --help
```
