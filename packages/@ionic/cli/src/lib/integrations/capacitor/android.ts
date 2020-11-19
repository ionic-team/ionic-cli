import { readFile, writeFile, unlink } from '@ionic/utils-fs';
import * as et from 'elementtree';

export const ANDROID_MANIFEST_FILE = 'AndroidManifest.xml';

export class CapacitorAndroidManifest {
  protected _doc?: et.ElementTree;
  protected origManifestContent?: string;
  protected saving = false;

  constructor(readonly manifestPath: string) {}

  get origManifestPath(): string {
    return `${this.manifestPath}.orig`;
  }

  get doc(): et.ElementTree {
    if (!this._doc) {
      throw new Error('No doc loaded.');
    }

    return this._doc;
  }

  static async load(manifestPath: string): Promise<CapacitorAndroidManifest> {
    if (!manifestPath) {
      throw new Error(`Must supply file path for ${ANDROID_MANIFEST_FILE}.`);
    }

    const conf = new CapacitorAndroidManifest(manifestPath);
    await conf.reload();

    return conf;
  }

  protected async reload(): Promise<void> {
    this.origManifestContent = await readFile(this.manifestPath, { encoding: 'utf8' });

    try {
      this._doc = et.parse(this.origManifestContent);
    } catch (e) {
      throw new Error(`Cannot parse ${ANDROID_MANIFEST_FILE} file: ${e.stack ?? e}`);
    }
  }

  enableCleartextTraffic() {
    const node = this.getApplicationNode();
    node.set('android:usesCleartextTraffic', 'true');
  }

  async reset(): Promise<void> {
    const origManifestContent = await readFile(this.origManifestPath, { encoding: 'utf8' });

    if (!this.saving) {
      this.saving = true;
      await writeFile(this.manifestPath, origManifestContent, { encoding: 'utf8' });
      await unlink(this.origManifestPath);
      this.saving = false;
    }
  }

  async save(): Promise<void> {
    if (!this.saving) {
      this.saving = true;

      if (this.origManifestContent) {
        await writeFile(this.origManifestPath, this.origManifestContent, { encoding: 'utf8' });
        this.origManifestContent = undefined;
      }

      await writeFile(this.manifestPath, this.write(), { encoding: 'utf8' });

      this.saving = false;
    }
  }

  protected getApplicationNode(): et.Element {
    const root = this.doc.getroot();
    const applicationNode = root.find('application');

    if (!applicationNode) {
      throw new Error(`No <application> node in ${ANDROID_MANIFEST_FILE}.`);
    }

    return applicationNode;
  }

  protected write(): string {
    const contents = this.doc.write({ indent: 4 });

    return contents;
  }
}
