# CLI Hooks

A collection of useful hook scripts for Ionic apps.

## Install

```bash
$ npm i @ionic/cli-hooks
```

## Use

Modify your `ionic.config.json` file to add a `hooks` object:

```json
  "hooks": {
    "<hook>": [
      "node_modules/@ionic/cli-hooks/<file>.js"
    ]
  }
```

Replace `<hook>` with the name of the hook you want to use and `<file>` with
the file name within this package.

See [CLI Hook
documentation](https://ionicframework.com/docs/cli/configuring.html#hooks) for
details.
