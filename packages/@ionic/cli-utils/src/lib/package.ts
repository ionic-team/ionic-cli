import chalk from 'chalk';

import { IClient, PackageBuild, PackageProjectRequest } from '../definitions';
import { isPackageBuildResponse, isPackageBuildsResponse, isPackageProjectRequestResponse } from '../guards';
import { s3SignedUpload } from './utils/aws';
import { createFatalAPIFormat, createRequest } from './http';

export class PackageClient {
  constructor(protected appUserToken: string, protected client: IClient) {}

  async getBuild(id: number, { fields = [] }: { fields?: string[] }): Promise<PackageBuild> {
    if (fields.indexOf('url') === -1) {
      fields.push('url');
    }

    const { req } = await this.client.make('GET', `/package/builds/${id}`);
    req.set('Authorization', `Bearer ${this.appUserToken}`).query({ fields }).send();
    const res = await this.client.do(req);

    if (!isPackageBuildResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async getBuilds({ page = 1, pageSize = 25 }: { page?: number, pageSize?: number }): Promise<PackageBuild[]> {
    const { req } = await this.client.make('GET', '/package/builds');
    req.set('Authorization', `Bearer ${this.appUserToken}`).query({ page, 'page_size': pageSize, }).send();
    const res = await this.client.do(req);

    if (!isPackageBuildsResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async queueBuild({ platform, mode, zipUrl, projectId, profileTag }: { platform: PackageBuild['platform'], mode: PackageBuild['mode'], zipUrl: string, projectId: number, profileTag?: string }): Promise<PackageBuild> {
    const { req } = await this.client.make('POST', '/package/builds');
    req
      .set('Authorization', `Bearer ${this.appUserToken}`)
      .send({
        platform,
        build_mode: mode,
        zip_url: zipUrl,
        project_id: projectId,
        security_profile_tag: profileTag,
      });

    const res = await this.client.do(req);

    if (!isPackageBuildResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async requestProjectUpload(): Promise<PackageProjectRequest> {
    const { req } = await this.client.make('POST', '/package/projects');
    req.set('Authorization', `Bearer ${this.appUserToken}`).send({});
    const res = await this.client.do(req);

    if (!isPackageProjectRequestResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async uploadProject(project: PackageProjectRequest, zip: NodeJS.ReadableStream, { progress }: { progress?: (loaded: number, total: number) => void }): Promise<void> {
    return s3SignedUpload(this.client.config, project.presigned_post, zip, { progress });
  }

  async downloadBuild(build: PackageBuild, dest: NodeJS.WritableStream, { progress }: { progress?: (loaded: number, total: number) => void }): Promise<void> {
    if (build.status !== 'SUCCESS') {
      throw new Error(`Build must be 'SUCCESS', not '${build.status}'.`);
    }

    if (!build.url) {
      throw new Error('Build must have URL.');
    }

    const { req } = await createRequest(this.client.config, 'get', build.url);

    return new Promise<void>((resolve, reject) => {
      dest.on('error', (err: any) => {
        reject(err);
      });

      dest.on('close', () => {
        resolve();
      });

      req
        .on('response', (res) => {
          if (progress) {
            let loaded = 0;
            const total = Number(res.headers['content-length']);
            res.on('data', (chunk) => {
              loaded += chunk.length;
              progress(loaded, total);
            });
          }
        })
        .on('error', (err) => {
          reject(err);
        })
        .pipe(dest);
    });
  }

  colorStatus(s: PackageBuild['status']): string {
    switch (s) {
      case 'SUCCESS':
        return chalk.green(s);
      case 'FAILED':
        return chalk.red(s);
    }

    return s;
  }

  formatFilename(build: PackageBuild) {
    const extension = build.platform === 'android' ? 'apk' : 'ipa';
    return `${build.name}.${extension}`;
  }

  formatPlatform(p: PackageBuild['platform'] | string): string {
    switch (p) {
      case 'ios':
        return 'iOS';
      case 'android':
        return 'Android';
    }

    return p;
  }

  formatBuildValues(build: PackageBuild): { [P in keyof PackageBuild]?: string } {
    return {
      id: String(build.id),
      status: this.colorStatus(build.status),
      platform: this.formatPlatform(build.platform),
      mode: build.mode,
      security_profile_tag: build.security_profile_tag || '',
      created: new Date(build.created).toISOString(),
      completed: build.completed ? new Date(build.completed).toISOString() : '',
    };
  }

}
