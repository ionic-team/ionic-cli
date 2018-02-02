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

## List

* `node_modules/@ionic/cli-hooks/add-cordova-engine.js`: Before a build, insert `cordova.js` script tag into your `index.html` file if it does not already exist.
* `node_modules/@ionic/cli-hooks/remove-cordova-engine.js`: After a build, restore the original `index.html` file.
