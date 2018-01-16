import { formatPageHeader } from '../utils';

export default async function() {
  return `${formatPageHeader('Configuring', 'cli-configuration')}

{% include fluid/toc.html %}

## Config Files

Configuration values are stored in JSON files.

* Global config file (\`~/.ionic/config.json\`): for global CLI config and auth
* Project config files (\`ionic.config.json\`): for Ionic project config

The CLI provides the \`ionic config\` commands for setting and printing config values from project config files and the global CLI config file.

## Integrations

You can manage integrations with the \`ionic integrations\` commands.

Integrations may also be auto-activated, but can also be disabled easily. When integrations are enabled, the behavior of the CLI may change. For example, when the Cordova integration is enabled, \`ionic cordova prepare\` will run after \`ionic build\` runs.

* \`cordova\`: Provides integration with [Apache Cordova](https://cordova.apache.org/) to target Native iOS and Android.

## Environment Variables

The CLI will look for the following environment variables:

* \`IONIC_CONFIG_DIRECTORY\`: The directory of the global CLI config. Defaults to \`~/.ionic\`.
* \`IONIC_HTTP_PROXY\`: Set a URL for proxying all CLI requests through. See [Using a Proxy](#using-a-proxy). The CLI will also look for \`HTTP_PROXY\`, which npm uses.
* \`IONIC_TOKEN\`: For automatic login with an auth token.
* \`IONIC_EMAIL\` / \`IONIC_PASSWORD\`: For automatic login with email & password.

\`IONIC_TOKEN\` and \`IONIC_EMAIL\` / \`IONIC_PASSWORD\` both initiate a session, which means they write your token to the global CLI config file. When the CLI detects a change in these environment variables, a new session is used.

### Command Options

You can express command options (normally set with \`--opt=value\` syntax) with environment variables. The naming of these environment variables follows a pattern: start with \`IONIC_CMDOPTS_\`, add the command name (replacing any spaces with underscores), add the option name (replacing any hyphens with underscores), and then uppercase everything. Boolean flags (command-line options that don't take a value) can be set to \`1\` or \`0\`. Strip the \`--no-\` prefix in boolean flags, if it exists (\`--no-open\` in \`ionic serve\` can be expressed with \`IONIC_CMDOPTS_SERVE_OPEN=0\`, for example).

For example, the command options in \`ionic cordova run ios -lc --livereload-port=1234 --address=localhost\` can also be expressed with this series of environment variables:

\`\`\`bash
export IONIC_CMDOPTS_CORDOVA_RUN_LIVERELOAD=1
export IONIC_CMDOPTS_CORDOVA_RUN_CONSOLELOGS=1
export IONIC_CMDOPTS_CORDOVA_RUN_LIVERELOAD_PORT=1234
export IONIC_CMDOPTS_CORDOVA_RUN_ADDRESS=localhost
\`\`\`

If these variables are set in your environment, \`ionic cordova build ios\` will use new defaults for its options.

## Flags

CLI flags are global options that alter the behavior of a CLI command.

* \`--help\`: Instead of running the command, view its help page.
* \`--verbose\`: Show all log messages for debugging purposes.
* \`--quiet\`: Only show \`WARN\` and \`ERROR\` log messages.
* \`--no-interactive\`: Turn off interactive prompts and fancy outputs. If a CI server is detected (we use [ci-info](https://www.npmjs.com/package/ci-info)), the CLI is automatically non-interactive.
* \`--no-color\`: Turn off colors.
* \`--confirm\`: Turn on auto-confirmation of confirmation prompts. *Careful*: the CLI prompts before doing something potentially harmful. Auto-confirming may have unintended results.

## Building your App

The [\`ionic build\`](/docs/cli/build/) command will build your app (compile your source code and assets into a distributable set of files). It knows what to do for your Ionic app based upon its [project type](docs/cli/projects.html).

You can configure this by using the \`ionic:build\` [npm script](https://docs.npmjs.com/misc/scripts). If this script is defined in \`package.json\`, the \`ionic build\` command will call it instead of the default. It is important to continue using \`ionic build\` so Ionic functionality (such as Ionic Pro features) continue working.

## Hooks

CLI hooks are how you can run scripts during CLI events, such as "watch" and "build". To hook into the CLI, use the following [npm scripts](https://docs.npmjs.com/misc/scripts) in your \`package.json\` file:

| npm script             | commands                                                                                   |
|------------------------|--------------------------------------------------------------------------------------------|
| \`ionic:watch:before\` | \`ionic serve\`, \`ionic cordova run -l\`, \`ionic cordova emulate -l\`                    |
| \`ionic:build:before\` | \`ionic build\`, \`ionic cordova build\`, \`ionic cordova run\`, \`ionic cordova emulate\` |
| \`ionic:build:after\`  | \`ionic build\`, \`ionic cordova build\`, \`ionic cordova run\`, \`ionic cordova emulate\` |

### Example

\`\`\`json
  "scripts": {
    "ionic:build:before": "cp somefile www/somefile",
  }
\`\`\`

## Using a Proxy

To proxy HTTP requests performed by the CLI, you will need to install the CLI proxy plugin in the same \`node_modules\` context as the Ionic CLI:

For CLI installed globally:

\`\`\`bash
$ npm i -g @ionic/cli-plugin-proxy
\`\`\`

For CLI installed locally:

\`\`\`bash
$ cd myProject # cd into your project's directory
$ npm i -E -D @ionic/cli-plugin-proxy
\`\`\`

Then, use one of the following environment variables:

\`\`\`bash
$ export HTTP_PROXY="http://proxy.example.com:8888" # also used by npm
$ export IONIC_HTTP_PROXY="http://proxy.example.com:8888"
\`\`\`

*Note: The Ionic CLI will also detect the \`proxy\`, \`PROXY\`, \`http_proxy\`, \`https_proxy\`, and \`HTTPS_PROXY\` environment variables, which are commonly used in other CLIs.*

### Other CLIs

Each CLI that you use must be configured separately to proxy network requests.

#### npm

\`\`\`bash
$ npm config set proxy http://proxy.company.com:8888
\`\`\`

#### git

\`\`\`bash
$ git config --global http.proxy http://proxy.example.com:8888
\`\`\`

### SSL Configuration

You can configure the Ionic CLI's SSL (similar to configuring npm CLI):

\`\`\`bash
$ ionic config set -g ssl.cafile /path/to/cafile # file path to your CA root certificate
$ ionic config set -g ssl.certfile /path/to/certfile # file path to a client certificate
$ ionic config set -g ssl.keyfile /path/to/keyfile # file path to a client key file
\`\`\`

The \`cafile\`, \`certfile\`, and \`keyfile\` entries can be manually edited as arrays of strings in \`~/.ionic/config.json\` to include multiple files.

## Telemetry

By default, the Ionic CLI sends usage data to Ionic, which we use to better your experience. To disable this functionality, you can run \`ionic config set -g telemetry false\`.
`;
}
