import { generate as generateTree } from 'ascii-tree';

import { formatPageHeader } from '../utils';

export default async function() {
  return `${formatPageHeader('Project Types', 'cli-projects')}

{% include fluid/toc.html %}

The Ionic CLI works with a variety of Ionic project types. The type of a project is stored in the project's \`ionic.config.json\` file as \`type\`. Here is a list of project type values:

* \`ionic-angular\`: [Ionic Angular](#ionic-angular)
* \`ionic1\`: [Ionic 1](#ionic-1)
* \`custom\`: The CLI will not invoke anything for build or serve. See [Hooks](/docs/cli/configuring.html#hooks) to use \`ionic build\` and \`ionic serve\` with your own build process.

## Ionic Angular

Ionic Angular ([\`ionic-angular\`](https://www.npmjs.com/package/ionic-angular)) uses [Angular 5](https://angular.io/) and [\`@ionic/app-scripts\`](https://github.com/ionic-team/ionic-app-scripts) for tooling.

You can start a new Ionic Angular app with the following command:

\`\`\`bash
$ ionic start --type=ionic-angular
\`\`\`

See [Starter Templates](/docs/cli/starters.html#ionic-angular) for a list of starters for Ionic Angular.

Ionic Angular apps are written in [TypeScript](https://www.typescriptlang.org/) and [Sass](http://sass-lang.com/) and are compiled and built with [\`@ionic/app-scripts\`](https://github.com/ionic-team/ionic-app-scripts), which is a configurable build system optimized for Ionic Angular.

\`ionic build\` and \`ionic serve\` use \`@ionic/app-scripts\` out of the box, so it doesn't need to be invoked directly. It also ships with good defaults, but can be configured in a variety of ways. See [\`README.md\`](https://github.com/ionic-team/ionic-app-scripts/blob/master/README.md) for configuration details.

### Project Structure

\`\`\`
${generateTree(`
*project/
**ionic.config.json # Ionic project config file
**package.json
**src/
***app/
****app.component.ts # root component for your app
****app.html # app component template
****app.module.ts # NgModule for app component
****app.scss # global SCSS
****main.ts # bootstrap file
***assets/ # put your images, etc. here
***pages/ # contains the page components for your app
***theme/
****variables.scss # see https://ionicframework.com/docs/theming
***index.html # main html file
**www/ # build output directory
`.trim())}
\`\`\`

### Proxies

The CLI can add proxies to the HTTP server for "livereload" commands like \`ionic serve\` and \`ionic cordova run android -lc\`. These proxies are useful if you are developing in the browser and you need to make calls to an external API. With this feature you can proxy requests to the external API through the Ionic CLI, which prevents the \`No 'Access-Control-Allow-Origin' header is present on the requested resource\` error.

In the \`ionic.config.json\` file you can add a property with an array of proxies you want to add. The proxies are an object with the following properties:

* \`path\`: string that will be matched against the beginning of the incoming request URL.
* \`proxyUrl\`: a string with the url of where the proxied request should go.
* \`proxyNoAgent\`: (optional) true/false, if true opts out of connection pooling, see [HttpAgent](https://nodejs.org/api/http.html#http_class_http_agent)

\`\`\`json
{
  "name": "appname",
  "app_id": "",
  "type": "ionic-angular",
  "proxies": [
    {
      "path": "/v1",
      "proxyUrl": "https://api.instagram.com/v1"
    }
  ]
}
\`\`\`

Using the above configuration, you can now make requests to your local server at \`http://localhost:8100/v1\` to have it proxy out requests to \`https://api.instagram.com/v1\`.

*Note: Don't forget to change the URLs being requested in your app to the local URL. Also, the "livereload" command must be restarted for the proxy configuration to take effect.*

## Ionic 1

Ionic 1 ([\`ionic-v1\`](https://github.com/ionic-team/ionic-v1/)) uses [AngularJS](https://angularjs.org/).

You can start a new Ionic 1 app with the following command:

\`\`\`bash
$ ionic start --type=ionic1
\`\`\`

See [Starter Templates](/docs/cli/starters.html#ionic-1) for a list of starters for Ionic 1.

Out of the box, Ionic 1 apps have no build process. \`www/index.html\` includes the \`www/css/style.css\` file and the three provided JS files withing \`www/js/\`.

### Project Structure

\`\`\`
${generateTree(`
*project/
**bower.json
**gulpfile.js
**ionic.config.json # Ionic project config file
**package.json
**scss/
***ionic.app.scss # enable sass to use
**www/
***css/
****style.css # vanilla CSS source file
***js/
****app.js # bootstrap file, contains \`.config()\`
****controllers.js # https://docs.angularjs.org/guide/controller
****services.js # https://docs.angularjs.org/guide/services
***templates/ # AngularJS templates
***index.html # main html file
`.trim())}
\`\`\`

### Enabling Sass

You can use [Sass](http://sass-lang.com/) by changing which CSS file \`www/index.html\` uses (\`css/style.css\` is the default, \`css/ionic.app.css\` is generated and includes both Ionic styles and your app's styles).

The main Sass source file is located at \`scss/ionic.app.scss\`.

If your \`gulpfile.js\` contains the \`sass\` task, the CLI will run it automatically during the \`ionic build\` and \`ionic serve\` commands.

### Proxies

The CLI can add proxies to the HTTP server for "livereload" commands like \`ionic serve\` and \`ionic cordova run android -lc\`. These proxies are useful if you are developing in the browser and you need to make calls to an external API. With this feature you can proxy requests to the external API through the Ionic CLI, which prevents the \`No 'Access-Control-Allow-Origin' header is present on the requested resource\` error.

In the \`ionic.config.json\` file you can add a property with an array of proxies you want to add. The proxies are an object with the following properties:

* \`path\`: string that will be matched against the beginning of the incoming request URL.
* \`proxyUrl\`: a string with the url of where the proxied request should go.
* \`proxyNoAgent\`: (optional) true/false, if true opts out of connection pooling, see [HttpAgent](https://nodejs.org/api/http.html#http_class_http_agent)

\`\`\`json
{
  "name": "appname",
  "app_id": "",
  "type": "ionic-angular",
  "proxies": [
    {
      "path": "/v1",
      "proxyUrl": "https://api.instagram.com/v1"
    }
  ]
}
\`\`\`

Using the above configuration, you can now make requests to your local server at \`http://localhost:8100/v1\` to have it proxy out requests to \`https://api.instagram.com/v1\`.

*Note: Don't forget to change the URLs being requested in your app to the local URL. Also, the "livereload" command must be restarted for the proxy configuration to take effect.*

`;
}
