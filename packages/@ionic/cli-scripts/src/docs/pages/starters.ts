import { ProjectType, StarterTemplate } from '@ionic/cli-utils';
import { STARTER_TEMPLATES } from '@ionic/cli-utils/lib/start';

import { formatPageHeader } from '../utils';

interface Starter {
  type: ProjectType;
  name: string;
  description: string;
  starters: StarterTemplate[];
}

const STARTERS: Starter[] = [
  // {
  //   type: 'angular',
  //   name: 'Ionic for Angular',
  //   description: `
// These starters are for Ionic for Angular (\`@ionic/angular\`), which uses the latest version of Angular and the [Angular CLI](https://github.com/angular/angular-cli) for tooling.
// `.trim(),
  //   starters: STARTER_TEMPLATES.filter(s => s.type === 'angular'),
  // },
  {
    type: 'ionic-angular',
    name: 'Ionic Angular',
    description: `
These starters are for Ionic Angular (\`ionic-angular\`), which uses Angular 5 and [\`@ionic/app-scripts\`](https://github.com/ionic-team/ionic-app-scripts) for tooling.
`.trim(),
    starters: STARTER_TEMPLATES.filter(s => s.type === 'ionic-angular'),
  },
  {
    type: 'ionic1',
    name: 'Ionic 1',
    description: `
These starters are for [Ionic 1](https://github.com/ionic-team/ionic-v1) and [AngularJS](https://angularjs.org/).

For new apps, we recommend the latest version of [Ionic Angular](https://github.com/ionic-team/ionic).
`.trim(),
    starters: STARTER_TEMPLATES.filter(s => s.type === 'ionic1'),
  },
];

export default async function() {
  const formatStarter = (t: StarterTemplate) => {
    return `\`${t.name}\` | ${t.description}\n`;
  };

  const formatStartersTable = (starterType: Starter) => {
    return `
### ${starterType.name}

${starterType.description}

Starter | Description
--------|------------
${starterType.starters.map(formatStarter).join('')}
`;
  };

  return `${formatPageHeader('Starter Templates', 'cli-starter-list')}

{% include fluid/toc.html %}

This is list of official Ionic starter templates, which are ready-to-go starter packs for your next Ionic app. See the [\`ionic start\`](/docs/cli/start/) docs for usage.

## Starter Types

${STARTERS.map(formatStartersTable).join('')}

## How it Works

Starters are constructed within the [Ionic Starters](https://github.com/ionic-team/starters) repository by overlaying a starter app onto a set of base files, constructing a compressed archive of the files, and uploading it around the world. The Ionic CLI then downloads and extracts the starter template archive and personalizes files for each new app.
`;
}
