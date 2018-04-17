import chalk from 'chalk';

import { contains, validate } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, TreatableAilment, isExitCodeException, isTreatableAilment } from '@ionic/cli-utils';
import { FatalException } from '@ionic/cli-utils/lib/errors';

import { DoctorCommand } from './base';

const ERROR_AILMENT_IGNORED = 'AILMENT_IGNORED';
const ERROR_AILMENT_SKIPPED = 'AILMENT_SKIPPED';

export class DoctorTreatCommand extends DoctorCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'treat',
      type: 'project',
      summary: 'Attempt to fix issues in your Ionic project',
      description: `
This command detects and attempts to fix common issues. Before a fix is attempted, the steps are printed and a confirmation prompt is displayed.

Optionally supply the ${chalk.green('id')} argument to attempt to fix a single issue. Use ${chalk.green('ionic doctor list')} to list all known issues.
      `,
      exampleCommands: [
        '',
        'git-not-used',
      ],
      inputs: [
        {
          name: 'id',
          summary: 'The issue identifier',
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { formatAilmentMessage } = await import('@ionic/cli-utils/lib/doctor');

    const [ id ] = inputs;
    const config = await this.env.config.load();

    if (id) {
      const registry = await this.getRegistry();
      const ailmentIds = registry.ailments.map(ailment => ailment.id);
      validate(id, 'id', [contains(ailmentIds, {})]);
      const ailment = registry.get(id);

      if (!ailment) {
        throw new FatalException(`Issue not found by ID: ${chalk.green(id)}`);
      }

      const detected = await ailment.detected();

      if (!detected) {
        this.env.log.ok(`${chalk.green(ailment.id)} does not need fixing as it was not detected.`);
        return;
      }

      if (!isTreatableAilment(ailment)) {
        this.env.log.warn(await formatAilmentMessage(ailment));

        throw new FatalException(
          `Issue cannot be fixed automatically: ${chalk.green(ailment.id)}\n` +
          `Unfortunately the CLI can't automatically fix the specified issue at this time. However, please see the steps above for manually fixing the issue.`
        );
      }

      if (config.doctor.issues[ailment.id] !== false) {
        const confirm = await this.env.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `${chalk.green(ailment.id)} is ignored, are you sure you want to continue?`,
        });

        if (!confirm) {
          return;
        }

        const issueConfig = config.doctor.issues[ailment.id];

        if (issueConfig) {
          delete issueConfig.ignored;
        }
      }

      try {
        await this.treatAilment(ailment);
      } catch (e) {
        this.handleError(e);
      }
    } else {
      const ailments = await this.detectTreatableAilments();
      await this.treatAilments(ailments);
    }
  }

  async treatAilments(ailments: TreatableAilment[]) {
    let treatedAilments = 0;

    for (const ailment of ailments) {
      try {
        const treated = await this.treatAilment(ailment);

        if (treated) {
          treatedAilments += 1;
        }
      } catch (e) {
        this.handleError(e);
      }
    }

    const fn = treatedAilments > 0 ? this.env.log.info.bind(this.env.log) : this.env.log.ok.bind(this.env.log);

    fn(
      'Doctor Summary\n' +
      `- Detected ${chalk.bold(String(ailments.length))} issue${ailments.length === 1 ? '' : 's'}.` +
      `${ailments.length === 0 ? ' Aww yeah! 💪' : ''}\n` +
      `- ${chalk.bold(String(treatedAilments))} ${treatedAilments === 1 ? 'issue was' : 'issues were'} fixed automatically`
    );
  }

  handleError(e: any) {
    if (e !== ERROR_AILMENT_SKIPPED && e !== ERROR_AILMENT_IGNORED) {
      if (isExitCodeException(e)) {
        this.env.log.error(`Error occurred during automatic fix: ${e.message}`);
      } else {
        this.env.log.error(`Error occurred during automatic fix: ${e.stack ? e.stack : e}`);
      }
    }
  }

  async treatAilment(ailment: TreatableAilment) {
    const { formatAilmentMessage } = await import('@ionic/cli-utils/lib/doctor');

    const config = await this.env.config.load();
    const treatmentSteps = await ailment.getTreatmentSteps();
    this.env.log.warn(await formatAilmentMessage(ailment));

    const CHOICE_YES = 'yes';
    const CHOICE_NO = 'no';
    const CHOICE_IGNORE = 'ignore';

    const choice = await this.env.prompt({
      type: 'list',
      name: 'choice',
      message: `Fix automatically?`,
      choices: [
        {
          name: 'Yes',
          value: CHOICE_YES,
        },
        {
          name: 'No',
          value: CHOICE_NO,
        },
        {
          name: 'Ignore forever',
          value: CHOICE_IGNORE,
        },
      ],
    });

    if (choice === CHOICE_YES) {
      for (const i in treatmentSteps) {
        const step = treatmentSteps[i];

        try {
          await step.treat();
        } catch (e) {
          if (!isExitCodeException(e) || e.exitCode > 0) {
            throw e;
          }
        }
      }

      return true;
    } else if (choice === CHOICE_NO) {
      throw ERROR_AILMENT_SKIPPED;
    } else if (choice === CHOICE_IGNORE) {
      const issueConfig = config.doctor.issues[ailment.id] || {};
      issueConfig.ignored = true;
      config.doctor.issues[ailment.id] = issueConfig;

      throw ERROR_AILMENT_IGNORED;
    }

    return false;
  }
}
