import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-framework';
import { CommandMetadata } from '../../definitions';
import { Command } from '../../lib/command';
interface DeployBuild {
    artifact_name: string;
    job_id: number;
    id: string;
    caller_id: number;
    created: string;
    finished: string;
    state: string;
    commit: any;
    automation_id: number;
    environment_id: number;
    native_config_id: number;
    automation_name: string;
    environment_name: string;
    job: any;
    pending_channels: string[];
}
interface DownloadUrl {
    url: string | null;
}
export declare class BuildCommand extends Command {
    getMetadata(): Promise<CommandMetadata>;
    run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;
    createDeployBuild(appflowId: string, token: string, options: CommandLineOptions): Promise<DeployBuild>;
    tailBuildLog(appflowId: string, buildId: number, token: string): Promise<DeployBuild>;
    getDeployBuild(appflowId: string, buildId: number, token: string): Promise<DeployBuild>;
    getDownloadUrl(appflowId: string, buildId: number, token: string): Promise<DownloadUrl>;
    downloadBuild(url: string, filename: string): Promise<string>;
    sanitizeString(value: string | string[] | boolean | null | undefined): Promise<string>;
}
export {};
