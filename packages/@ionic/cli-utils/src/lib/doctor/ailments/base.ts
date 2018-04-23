import * as Debug from 'debug';
import { IDebugger } from 'debug';
import { DoctorAilmentId, IAilment, IAilmentRegistry, IClient, IConfig, ILogger, IProject, ISession, IShell, PatientTreatmentStep, ProjectType } from '../../../definitions';

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
  private _debug?: IDebugger;

  abstract readonly id: DoctorAilmentId;
  readonly projects?: ProjectType[] = undefined;
  readonly implicit: boolean = true;

  constructor({ client, config, log, project, shell, session }: AilmentDeps) {
    this.client = client;
    this.config = config;
    this.log = log;
    this.project = project;
    this.shell = shell;
    this.session = session;
  }

  get debug() {
    if (!this._debug) {
      this._debug = Debug(`ionic:cli-utils:lib:doctor:ailments:${this.id}`);
    }

    return this._debug;
  }

  abstract async getMessage(): Promise<string>;
  abstract async detected(): Promise<boolean>;
  abstract async getTreatmentSteps(): Promise<PatientTreatmentStep[]>;
}

export class AilmentRegistry implements IAilmentRegistry {
  protected _ailments: IAilment[] = [];

  register(ailment: IAilment) {
    this._ailments.push(ailment);
  }

  get ailments(): IAilment[] {
    return this._ailments;
  }

  get(id: string): IAilment | undefined {
    return this._ailments.find(a => a.id === id);
  }
}
