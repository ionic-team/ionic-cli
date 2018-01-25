import {
  AutomaticTreatmentStep,
  IAilment,
  IAilmentRegistry,
  IAutomaticallyTreatableAilment,
  IClient,
  IConfig,
  ILogger,
  IProject,
  ISession,
  IShell,
  PromptModule,
  TreatmentStep,
} from '../../../definitions';

import { isExitCodeException } from '../../../guards';

export const ERROR_AILMENT_IGNORED = 'AILMENT_IGNORED';
export const ERROR_AILMENT_SKIPPED = 'AILMENT_SKIPPED';

export interface AilmentDeps {
  client: IClient;
  config: IConfig;
  log: ILogger;
  project: IProject;
  shell: IShell;
  session: ISession;
}

export abstract class Ailment implements IAilment {
  protected readonly client: IClient;
  protected readonly config: IConfig;
  protected readonly log: ILogger;
  protected readonly project: IProject;
  protected readonly shell: IShell;
  protected readonly session: ISession;

  constructor({ client, config, log, project, shell, session }: AilmentDeps) {
    this.client = client;
    this.config = config;
    this.log = log;
    this.project = project;
    this.shell = shell;
    this.session = session;
  }

  abstract id: string;
  abstract async getMessage(): Promise<string>;
  abstract async getTreatmentSteps(): Promise<TreatmentStep[]>;
  abstract async detected(): Promise<boolean>;
}

export interface AutomaticallyTreatableAilmentDeps extends AilmentDeps {
  prompt: PromptModule;
}

export abstract class AutomaticallyTreatableAilment extends Ailment implements IAutomaticallyTreatableAilment {
  protected readonly prompt: PromptModule;

  constructor({ prompt, ...deps }: AutomaticallyTreatableAilmentDeps) {
    super(deps);
    this.prompt = prompt;
  }

  abstract async getTreatmentSteps(): Promise<AutomaticTreatmentStep[]>;

  async treat(): Promise<boolean> {
    const config = await this.config.load();
    const treatmentSteps = await this.getTreatmentSteps();
    const stepOutput = treatmentSteps.map((step, i) => `    ${i + 1}) ${step.name}`).join('\n');
    this.log.warn(`${await this.getMessage()}\n\nTo fix, the following step(s) need to be taken:\n\n${stepOutput}`);

    const CHOICE_YES = 'yes';
    const CHOICE_NO = 'no';
    const CHOICE_IGNORE = 'ignore';

    const choice = await this.prompt({
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
      config.state.doctor.ignored.push(this.id);
      throw ERROR_AILMENT_IGNORED;
    }

    return false;
  }
}

export class AilmentRegistry implements IAilmentRegistry {
  protected _ailments: IAilment[] = [];

  register(ailment: IAilment) {
    this._ailments.push(ailment);
  }

  get ailments(): IAilment[] {
    return this._ailments;
  }

  get(id: string) {
    return this._ailments.find(a => a.id === id);
  }
}
