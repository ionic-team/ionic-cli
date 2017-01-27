import * as path from 'path';
import * as chalk from 'chalk';
import {
  formatCommandHelp,
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  TaskChain
} from '@ionic/cli-utils';

import * as appGenerator from '@ionic/app-generators';

@CommandMetadata({
  name: 'generate',
  aliases: ['g'],
  description: 'Genarete pages and components',
  exampleCommands: ['page thingsList --skipScss --componentsDir="src/components"'],
  inputs: [
    {
      name: 'generator',
      description: 'The generator that you would like to use',
    },
    {
      name: 'name',
      description: 'The name that you like for the file',
    }
  ],
  options: [
    {
      name: 'list',
      description: 'List available generators',
      type: Boolean,
      default: false
    },
    {
      name: 'includeSpec',
      description: 'Create test spec basic to pages, components, directives, pipes and providers',
      type: Boolean,
      default: false
    },
    {
      name: 'skipScss',
      description: 'Do not create scss for components and pages',
      type: Boolean,
      default: false
    },
    {
      name: 'componentsDir',
      description: 'Project path where the component should be created',
      default: path.join('src', 'components'),
      type: String
    },
    {
      name: 'directivesDir',
      description: 'Project path where the directive should be created',
      default: path.join('src', 'components'),
      type: String
    },
    {
      name: 'pagesDir',
      description: 'Project path where the page should be created',
      default: path.join('src', 'pages'),
      type: String
    },
    {
      name: 'pipesDir',
      description: 'Project path where the pipe should be created',
      default: path.join('src', 'pipes'),
      type: String
    },
    {
      name: 'providersDir',
      description: 'Project path where the provider should be created',
      default: path.join('src', 'providers'),
      type: String
    },
    {
      name: 'templateDir',
      description: 'Project path for templates custom to pages, components, directives, pipes and providers',
      default: path.join('node_modules', 'ionic-angular', 'templates'),
      type: String
    }
  ]
})
export class GenerateCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // If there are no inputs then show help command help.
    if (inputs.length === 0) {
      this.env.log.error('Invalid number of arguments.');
      return this.env.log.msg(formatCommandHelp(this.metadata));
    }


    var generatorOptions = {
      generatorType: inputs[0],
      suppliedName: inputs[1],
      includeSpec: <boolean>options['includeSpec'],
      includeSass: options['skipSass'] === false
    };

    var projectStructureOptions = {
      absoluteComponentDirPath: path.resolve(this.env.project.directory, options['componentsDir']),
      absoluteDirectiveDirPath: path.resolve(this.env.project.directory, options['directivesDir']),
      absolutePagesDirPath: path.resolve(this.env.project.directory, options['pagesDir']),
      absolutePipeDirPath: path.resolve(this.env.project.directory, options['pipesDir']),
      absoluteProviderDirPath: path.resolve(this.env.project.directory, options['providersDir']),
      absolutePathTemplateBaseDir: path.resolve(this.env.project.directory, options['templateDir'])
    };

    var tasks = new TaskChain();

    tasks.next(`Generating ${chalk.bold(generatorOptions.generatorType)} named ${chalk.bold(generatorOptions.suppliedName)}`);

    try {
      await appGenerator.generate(generatorOptions, projectStructureOptions);
    } catch (e) {
      if (e.message === 'Unknown Generator Type') {
        this.env.log.error(e.message);
        appGenerator.printAvailableGenerators();
        return;
      }
      throw e;
    }

    tasks.end();
  }
}
