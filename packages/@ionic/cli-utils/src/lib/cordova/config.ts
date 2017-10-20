import * as fs from 'fs';
import * as path from 'path';

import * as et from 'elementtree';

import { ResourcesPlatform } from '../../definitions';
import { fsReadFile, fsWriteFile } from '@ionic/cli-framework/utils/fs';

export interface PlatformEngine {
  name: string;
  spec: string;
  [key: string]: string;
}

export class ConfigXml {
  protected _filePath?: string;
  protected _doc?: et.ElementTree;
  protected saving = false;

  get doc() {
    if (!this._doc) {
      throw new Error('No doc loaded. Call load() properly.');
    }

    return this._doc;
  }

  get filePath() {
    if (!this._filePath) {
      throw new Error('No file path given. Call load() properly.');
    }

    return this._filePath;
  }

  static async load(projectDir: string): Promise<ConfigXml> {
    if (!projectDir) {
      throw new Error('Must supply project directory.');
    }

    const conf = new ConfigXml();
    conf._filePath = path.join(projectDir, 'config.xml');
    const configFileContents = await fsReadFile(conf.filePath, { encoding: 'utf8' });

    if (!configFileContents) {
      throw new Error(`Cannot load empty config.xml file.`);
    }

    conf._doc = et.parse(configFileContents);

    return conf;
  }

  async save(): Promise<void> {
    if (!this.saving) {
      this.saving = true;
      await fsWriteFile(this.filePath, this.write(), { encoding: 'utf8' });
      this.saving = false;
    }
  }

  saveSync(): void {
    if (!this.saving) {
      this.saving = true;
      fs.writeFileSync(this.filePath, this.write(), { encoding: 'utf8' });
      this.saving = false;
    }
  }

  getBundleId() {
    const root = this.doc.getroot();
    return root.get('id');
  }

  /**
   * Update config.xml content src to be a dev server url. As part of this
   * backup the original content src for a reset to occur at a later time.
   */
  writeContentSrc(newSrc: string) {
    const root = this.doc.getroot();
    let contentElement = root.find('content');

    if (!contentElement) {
      contentElement = et.SubElement(root, 'content', { src: 'index.html' });
    }

    contentElement.set('original-src', contentElement.get('src'));
    contentElement.set('src', newSrc);

    let navElement = root.find(`allow-navigation[@href='${newSrc}']`);

    if (!navElement) {
      navElement = et.SubElement(root, 'allow-navigation', { href: newSrc });
    }
  }

  /**
   * Set config.xml src url back to its original url
   */
  resetContentSrc() {
    const root = this.doc.getroot();
    let contentElement = root.find('content');

    if (!contentElement) {
      contentElement = et.SubElement(root, 'content', { src: 'index.html' });
    }

    const originalSrc = contentElement.get('original-src');

    if (originalSrc) {
      contentElement.set('src', originalSrc);
      delete contentElement.attrib['original-src'];
    }
  }

  getPreference(prefName: string): string | undefined {
    const root = this.doc.getroot();

    const preferenceElement = root.find(`preference[@name='${prefName}']`);

    if (!preferenceElement) {
      return undefined;
    }

    const value = preferenceElement.get('value');

    if (!value) {
      return undefined;
    }

    return value;
  }

  getProjectInfo(): { id: string; name: string; version: string; } {
    const root = this.doc.getroot();

    let id = root.get('id');

    if (!id) {
      id = '';
    }

    let version = root.get('version');

    if (!version) {
      version = '';
    }

    let nameElement = root.find('name');

    if (!nameElement) {
      nameElement = et.SubElement(root, 'name', {});
    }

    if (!nameElement.text) {
      nameElement.text = 'MyApp';
    }

    const name = nameElement.text;

    return { id, name, version };
  }

  getPlatformEngines(): PlatformEngine[] {
    const root = this.doc.getroot();
    const engines = root.findall('engine');

    return engines.map(engine => this.engineElementToPlatformEngine(engine));
  }

  getPlatformEngine(platform: string): PlatformEngine | undefined {
    const root = this.doc.getroot();
    const engine = root.find(`engine[@name='${platform}']`);

    if (!engine) {
      return undefined;
    }

    return this.engineElementToPlatformEngine(engine);
  }

  async ensurePlatformImages(platform: string, resourcesPlatform: ResourcesPlatform) {
    const root = this.doc.getroot();
    const orientation = this.getPreference('Orientation') || 'default';

    for (let imgName in resourcesPlatform) {
      const imgType = resourcesPlatform[imgName];
      let platformElement = root.find(`platform[@name='${platform}']`);

      if (!platformElement) {
        platformElement = et.SubElement(root, 'platform', { name: platform });
      }

      const images = imgType.images.filter(img => orientation === 'default' || typeof img.orientation === 'undefined' || img.orientation === orientation);

      for (let image of images) {
        // We use forward slashes, (not path.join) here to provide
        // cross-platform compatibility for paths.
        const imgPath = ['resources', platform, imgType.nodeName, image.name].join('/'); // TODO: hard-coded 'resources' dir
        let imgElement = platformElement.find(`${imgType.nodeName}[@src='${imgPath}']`);

        if (!imgElement) {
          imgElement = platformElement.find(`${imgType.nodeName}[@src='${imgPath.split('/').join('\\')}']`);
        }

        if (!imgElement) {
          const attrs: { [key: string]: string } = {};

          for (let attr of imgType.nodeAttributes) {
            let v = (<any>image)[attr]; // TODO

            if (attr === 'src') {
              v = imgPath;
            }

            attrs[attr] = v;
          }

          imgElement = et.SubElement(platformElement, imgType.nodeName, attrs);
        }

        imgElement.set('src', imgPath);
      }
    }
  }

  async ensureSplashScreenPreferences() {
    const root = this.doc.getroot();

    let splashScreenPrefElement = root.find(`preference[@name='SplashScreen']`);

    if (!splashScreenPrefElement) {
      splashScreenPrefElement = et.SubElement(root, 'preference', { name: 'SplashScreen', value: 'screen' });
    }

    let splashShowOnlyFirstTimePrefElement = root.find(`preference[@name='SplashShowOnlyFirstTime']`);

    if (!splashShowOnlyFirstTimePrefElement) {
      splashShowOnlyFirstTimePrefElement = et.SubElement(root, 'preference', { name: 'SplashShowOnlyFirstTime', value: 'false' });
    }

    let splashScreenDelayPrefElement = root.find(`preference[@name='SplashScreenDelay']`);

    if (!splashScreenDelayPrefElement) {
      splashScreenDelayPrefElement = et.SubElement(root, 'preference', { name: 'SplashScreenDelay', value: '3000' });
    }
  }

  protected write(): string {
    // Cordova hard codes an indentation of 4 spaces, so we'll follow.
    const contents = this.doc.write({ indent: 4 });

    return contents;
  }

  protected engineElementToPlatformEngine(engine: et.IElement): PlatformEngine {
    const name = engine.get('name');
    const spec = engine.get('spec');

    return { name: name ? name : '', spec: spec ? spec : '', ...engine.attrib };
  }
}
