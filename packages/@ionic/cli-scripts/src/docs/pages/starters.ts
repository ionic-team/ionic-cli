import { StarterTemplate } from '@ionic/cli-utils';
import { STARTER_TEMPLATES } from '@ionic/cli-utils/lib/start';

import { formatPageHeader } from '../utils';

interface Starter {
  type: string;
  name: string;
  starters: StarterTemplate[];
}

export default async function() {
  const formatStarter = (t: StarterTemplate) => {
    return `\`${t.name}\` | ${t.description}\n`;
  };

  const formatStartersTable = (starterType: Starter) => {
    return `
### ${starterType.name}

Starter | Description
--------|------------
${starterType.starters.map(formatStarter).join('')}
`;
  };

  const starters: Starter[] = [
    {
      type: 'ionic-angular',
      name: 'Ionic Angular',
      starters: STARTER_TEMPLATES.filter(s => s.type === 'ionic-angular'),
    },
    {
      type: 'ionic1',
      name: 'Ionic 1',
      starters: STARTER_TEMPLATES.filter(s => s.type === 'ionic1'),
    },
  ];

  return `${formatPageHeader('Starter Templates', 'cli-starter-list')}

{% include fluid/toc.html %}

This is list of official Ionic starter templates, which are ready-to-go starter packs for your next Ionic app. See the [\`ionic start\`](/docs/cli/start/) docs for usage.

## Starter Types

${starters.map(formatStartersTable).join('')}

## How it Works

Starters are constructed within the [Ionic Starters](https://github.com/ionic-team/starters) repository by overlaying a starter app onto a set of base files, constructing a compressed archive of the files, and uploading it around the world. The Ionic CLI then downloads and extracts the starter template archive and personalizes files for each new app.
`;
}
