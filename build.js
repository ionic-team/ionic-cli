"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildCommand = void 0;
const cli_framework_output_1 = require("@ionic/cli-framework-output");
const utils_process_1 = require("@ionic/utils-process");
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const chalk = require("chalk");
const Debug = require("debug");
const fs = require("fs");
const guards_1 = require("../../guards");
const color_1 = require("../../lib/color");
const command_1 = require("../../lib/command");
const errors_1 = require("../../lib/errors");
const file_1 = require("../../lib/utils/file");
const http_1 = require("../../lib/utils/http");
const debug = Debug('ionic:commands:deploy:build');
class BuildCommand extends command_1.Command {
    async getMetadata() {
        const dashUrl = this.env.config.getDashUrl();
        return {
            name: 'build',
            type: 'project',
            groups: ["paid" /* PAID */],
            summary: 'Create a deploy build on Appflow',
            description: `
This command creates a deploy build on Appflow. While the build is running, it prints the remote build log to the terminal. If the build is successful, it downloads the created web build zip file in the current directory. Downloading build artifacts can be skipped by supplying the flag ${color_1.input('skip-download')}.

Apart from ${color_1.input('--commit')}, every option can be specified using the full name setup within the Appflow Dashboard[^dashboard].

Customizing the build:
- The ${color_1.input('--environment')} and ${color_1.input('--channel')} options can be used to customize the groups of values exposed to the build.
`,
            footnotes: [
                {
                    id: 'dashboard',
                    url: dashUrl,
                },
            ],
            exampleCommands: [
                '',
                '--environment="My Custom Environment Name"',
                '--commit=2345cd3305a1cf94de34e93b73a932f25baac77c',
                '--channel="Master"',
                '--channel="Master" --skip-download',
                '--channel="Master" --channel="My Custom Channel"',
            ],
            options: [
                {
                    name: 'environment',
                    summary: 'The group of environment variables exposed to your build',
                    type: String,
                    spec: { value: 'name' },
                },
                {
                    name: 'channel',
                    summary: 'The channel you want to auto deploy the build to. This can be repeated multiple times if multiple channels need to be specified.',
                    type: String,
                    spec: { value: 'name' },
                },
                {
                    name: 'commit',
                    summary: 'Commit (defaults to HEAD)',
                    type: String,
                    groups: ["advanced" /* ADVANCED */],
                    spec: { value: 'sha1' },
                },
                {
                    name: 'skip-download',
                    summary: `Skip downloading build artifacts after command succeeds.`,
                    type: Boolean,
                    spec: { value: 'name' },
                    default: false,
                },
                {
                    name: 'build-file-name',
                    summary: 'An optional name for the downloaded web artifacts.',
                    type: String,
                    spec: { value: 'name' },
                },
            ],
        };
    }
    async run(inputs, options) {
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input('ionic deploy build')} outside a project directory.`);
        }
        const token = await this.env.session.getUserToken();
        const appflowId = await this.project.requireAppflowId();
        if (!options.commit) {
            options.commit = (await this.env.shell.output('git', ['rev-parse', 'HEAD'], { cwd: this.project.directory })).trim();
            debug(`Commit hash: ${color_1.strong(options.commit)}`);
        }
        let build = await this.createDeployBuild(appflowId, token, options);
        const buildId = build.job_id;
        const details = utils_terminal_1.columnar([
            ['App ID', color_1.strong(appflowId)],
            ['Build ID', color_1.strong(buildId.toString())],
            ['Commit', color_1.strong(`${build.commit.sha.substring(0, 6)} ${build.commit.note}`)],
            ['Environment', build.environment_name ? color_1.strong(build.environment_name) : color_1.weak('not set')],
            ['Channels', build.pending_channels.length ? build.pending_channels.map(v => color_1.strong(`"${v}"`)).join(', ') : color_1.weak('not set')],
        ], { vsep: ':' });
        this.env.log.ok(`Build created\n` +
            details + '\n\n');
        build = await this.tailBuildLog(appflowId, buildId, token);
        if (build.state !== 'success') {
            throw new Error(`Build ${build.state}`);
        }
        if (options['skip-download']) {
            return;
        }
        const url = await this.getDownloadUrl(appflowId, buildId, token);
        if (!url.url) {
            throw new Error('Missing URL in response');
        }
        let buildFilename = build.artifact_name;
        if (options['build-file-name']) {
            buildFilename = await this.sanitizeString(options['build-file-name']);
        }
        const filename = await this.downloadBuild(url.url, buildFilename);
        this.env.log.ok(`Artifact downloaded: ${filename}`);
    }
    async createDeployBuild(appflowId, token, options) {
        const { req } = await this.env.client.make('POST', `/apps/${appflowId}/deploys/verbose_post`);
        let channels = [];
        if (options.channel) {
            if (typeof (options.channel) === 'string') {
                channels.push(String(options.channel));
            }
            else if (typeof (options.channel) === 'object') {
                channels = channels.concat(options.channel);
            }
        }
        req.set('Authorization', `Bearer ${token}`).send({
            commit_sha: options.commit,
            environment_name: options.environment,
            channel_names: channels ? channels : undefined,
        });
        try {
            const res = await this.env.client.do(req);
            return res.data;
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e)) {
                if (e.response.status === 401) {
                    this.env.log.error('Try logging out and back in again.');
                }
                const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
                throw new errors_1.FatalException(`Unable to create build: ` + apiErrorMessage);
            }
            else {
                throw e;
            }
        }
    }
    async tailBuildLog(appflowId, buildId, token) {
        let build;
        let start = 0;
        const ws = this.env.log.createWriteStream(cli_framework_output_1.LOGGER_LEVELS.INFO, false);
        let isCreatedMessage = false;
        let errorsEncountered = 0;
        while (!(build && ['success', 'failed', 'canceled'].includes(build.state))) {
            try {
                await utils_process_1.sleep(5000);
                build = await this.getDeployBuild(appflowId, buildId, token);
                if (build && build.state === 'created' && !isCreatedMessage) {
                    ws.write(chalk.yellow('Concurrency limit reached: build will start as soon as other builds finish.'));
                    isCreatedMessage = true;
                }
                const trace = build.job.trace;
                if (trace.length > start) {
                    ws.write(trace.substring(start));
                    start = trace.length;
                }
                errorsEncountered = 0;
            }
            catch (e) {
                // Retry up to 3 times in the case of an error.
                errorsEncountered++;
                ws.write(chalk.yellow(`Encountered error: ${e} while fetching build data retrying.`));
                if (errorsEncountered >= 3) {
                    ws.write(chalk.red(`Encountered ${errorsEncountered} errors in a row. Job will now fail.`));
                    throw e;
                }
            }
        }
        ws.end();
        return build;
    }
    async getDeployBuild(appflowId, buildId, token) {
        const { req } = await this.env.client.make('GET', `/apps/${appflowId}/deploys/${buildId}`);
        req.set('Authorization', `Bearer ${token}`).send();
        try {
            const res = await this.env.client.do(req);
            return res.data;
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e)) {
                if (e.response.status === 401) {
                    this.env.log.error('Try logging out and back in again.');
                }
                const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
                throw new errors_1.FatalException(`Unable to get build ${buildId}: ` + apiErrorMessage);
            }
            else {
                throw e;
            }
        }
    }
    async getDownloadUrl(appflowId, buildId, token) {
        const { req } = await this.env.client.make('GET', `/apps/${appflowId}/packages/${buildId}/download?artifact_type=WWW_ZIP`);
        req.set('Authorization', `Bearer ${token}`).send();
        try {
            const res = await this.env.client.do(req);
            return res.data;
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e)) {
                if (e.response.status === 401) {
                    this.env.log.error('Try logging out and back in again.');
                }
                const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
                throw new errors_1.FatalException(`Unable to get download URL for build ${buildId}: ` + apiErrorMessage);
            }
            else {
                throw e;
            }
        }
    }
    async downloadBuild(url, filename) {
        const { req } = await http_1.createRequest('GET', url, this.env.config.getHTTPConfig());
        const tmpFile = utils_fs_1.tmpfilepath('ionic-package-build');
        const ws = fs.createWriteStream(tmpFile);
        await http_1.download(req, ws, {});
        fs.copyFileSync(tmpFile, filename);
        fs.unlinkSync(tmpFile);
        return filename;
    }
    async sanitizeString(value) {
        if (!value || typeof (value) !== 'string') {
            return '';
        }
        if (!file_1.fileUtils.isValidFileName(value)) {
            throw new errors_1.FatalException(`${color_1.strong(String(value))} is not a valid file name`);
        }
        return String(value);
    }
}
exports.BuildCommand = BuildCommand;
