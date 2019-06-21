import { CommandLineOptions, MetadataGroup, contains, validators } from '@ionic/cli-framework';
import { pathWritable, readFile, writeFile } from '@ionic/utils-fs';
import * as et from 'elementtree';
import * as path from 'path';

import { CommandMetadataOption } from '../../definitions';
import { input } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

export abstract class DeployConfCommand extends Command {

  protected readonly commandOptions: CommandMetadataOption[] = [
    {
      name: 'app-id',
      summary: 'Your Appflow app ID',
      type: String,
      spec: { value: 'id' },
    },
    {
      name: 'channel-name',
      summary: 'The channel to check for updates from',
      type: String,
      spec: { value: 'name' },
    },
    {
      name: 'update-method',
      summary: 'The update method that dictates the behavior of the plugin',
      type: String,
      spec: { value: 'name' },
    },
    {
      name: 'max-store',
      summary: 'The maximum number of downloaded versions to store on the device for quick loading (default is 2 if not specified)',
      type: String,
      groups: [MetadataGroup.ADVANCED],
      spec: { value: 'quantity' },
      default: '2',
    },
    {
      name: 'min-background-duration',
      summary: 'The minimum duration in seconds after which the app in background checks for an update (default is 30 if not specified)',
      type: String,
      groups: [MetadataGroup.ADVANCED],
      spec: { value: 'quantity' },
      default: '30',
    },
    {
      name: 'update-api',
      summary: 'The location of the Appflow API (only use this for development)',
      type: String,
      groups: [MetadataGroup.ADVANCED],
      spec: { value: 'url' },
      default: 'https://api.ionicjs.com',
    },
  ];

  protected readonly optionsToPlistKeys = {
    'app-id': 'IonAppId',
    'channel-name': 'IonChannelName',
    'update-method': 'IonUpdateMethod',
    'max-store': 'IonMaxVersions',
    'min-background-duration': 'IonMinBackgroundDuration',
    'update-api': 'IonApi',
  };
  protected readonly optionsToStringXmlKeys = {
    'app-id': 'ionic_app_id',
    'channel-name': 'ionic_channel_name',
    'update-method': 'ionic_update_method',
    'max-store': 'ionic_max_versions',
    'min-background-duration': 'ionic_min_background_duration',
    'update-api': 'ionic_update_api',
  };
  protected readonly optionsToPlistKeysValues = Object.values(this.optionsToPlistKeys);

  protected async getAppIntegration(): Promise<string | undefined> {
    if (this.project) {
      if (this.project.getIntegration('capacitor') !== undefined) {
        return 'capacitor';
      }
      if (this.project.getIntegration('cordova') !== undefined) {
        return 'cordova';
      }
    }
    return undefined;
  }

  protected async requireNativeIntegration(): Promise<void> {
    const integration = await this.getAppIntegration();
    if (!integration) {
      throw new FatalException(`An integration (Cordova or Capacitor) is needed before adding the Deploy (cordova-plugin-ionic) plugin`);
    }
  }

  protected async getAppId(): Promise<string | undefined> {
    if (this.project) {
      return this.project.config.get('id');
    }
    return undefined;
  }

  protected async checkDeployInstalled(): Promise<boolean> {
    if (!this.project) {
      return false;
    }
    const packageJson = await this.project.requirePackageJson();
    return packageJson.dependencies ? 'cordova-plugin-ionic' in packageJson.dependencies : false;
  }

  protected printPlistInstructions(options: CommandLineOptions): void {
    let outputString = `You will need to manually modify the Info.plist for your iOS project.\n Please add the following content to your Info.plist file:\n`;
    for (const [optionKey, pKey] of Object.entries(this.optionsToPlistKeys)) {
      outputString = `${outputString}<key>${pKey}</key>\n<string>${options[optionKey]}</string>\n`;
    }
    this.env.log.warn(outputString);
  }

  protected printStringXmlInstructions(options: CommandLineOptions): void {
    let outputString = `You will need to manually modify the string.xml for your Android project.\n Please add the following content to your string.xml file:\n`;
    for (const [optionKey, pKey] of Object.entries(this.optionsToPlistKeys)) {
      outputString = `${outputString}<string name="${pKey}">${options[optionKey]}</string>\n`;
    }
    this.env.log.warn(outputString);
  }

  protected async getIosCapPlist(): Promise<string> {
    if (!this.project) {
      return '';
    }
    const capIntegration = this.project.getIntegration('capacitor');
    if (!capIntegration) {
      return '';
    }
    const assumedPlistPath = path.join(capIntegration.root, 'ios', 'App', 'App', 'Info.plist');
    if (!await pathWritable(assumedPlistPath)) {
      return '';
    }
    return assumedPlistPath;
  }

  protected async getAndroidCapString(): Promise<string> {
    if (!this.project) {
      return '';
    }
    const capIntegration = this.project.getIntegration('capacitor');
    if (!capIntegration) {
      return '';
    }
    const assumedStringXmlPath = path.join(capIntegration.root, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
    if (!await pathWritable(assumedStringXmlPath)) {
      return '';
    }
    return assumedStringXmlPath;
  }

  protected async addConfToIosPlist(options: CommandLineOptions): Promise<void> {
    const plistPath = await this.getIosCapPlist();
    if (!plistPath) {
      this.env.log.warn(`The iOS Info.plist could not be found.`);
      this.printPlistInstructions(options);
      return;
    }
    // try to load the plist file first
    let plistData;
    try {
      const plistFile = await readFile(plistPath);
      plistData = plistFile.toString();
    } catch (e) {
      this.env.log.error(`The iOS Info.plist could not be read.`);
      this.printPlistInstructions(options);
      return;
    }
    // parse it with elementtree
    let etree;
    try {
      etree = et.parse(plistData);
    } catch (e) {
      this.env.log.error(`Impossible to parse the XML in the Info.plist`);
      this.printPlistInstructions(options);
      return;
    }
    // check that it is an actual plist file (root tag plist and first child dict)
    const root = etree.getroot();
    if (root.tag !== 'plist') {
      this.env.log.error(`Info.plist is not a valid plist file because the root is not a <plist> tag`);
      this.printPlistInstructions(options);
      return;
    }
    const pdict = root.find('./dict');
    if (!pdict) {
      this.env.log.error(`Info.plist is not a valid plist file because the first child is not a <dict> tag`);
      this.printPlistInstructions(options);
      return;
    }
    // because elementtree has limited XPath support we cannot just run a smart selection, so we need to loop over all the elements
    const pdictChildren = pdict.getchildren();
    // there is no way to refer to a first right sibling in elementtree, so we use flags
    let removeNextStringTag = false;
    for (const element of pdictChildren) {
      // we remove all the existing element if there
      if ((element.tag === 'key') && (element.text) && this.optionsToPlistKeysValues.includes(element.text as string)) {
        pdict.remove(element);
        removeNextStringTag = true;
        continue;
      }
      // and remove the first right sibling (this will happen at the next iteration of the loop
      if ((element.tag === 'string') && removeNextStringTag) {
        pdict.remove(element);
        removeNextStringTag = false;
      }
    }
    // add again the new settings
    for (const [optionKey, plistKey] of Object.entries(this.optionsToPlistKeys)) {
      const plistValue = options[optionKey];
      if (!plistValue) {
        throw new FatalException(`This should never have happened: a parameter is missing so we cannot write the Info.plist`);
      }
      const pkey = et.SubElement(pdict, 'key');
      pkey.text = plistKey;
      const pstring = et.SubElement(pdict, 'string');
      pstring.text = plistValue;
    }
    // finally write back the modified plist
    const newXML = etree.write({
      encoding: 'utf-8',
      indent: 2,
      xml_declaration: false,
    });
    // elementtree cannot write a doctype, so little hack
    const xmlToWrite = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n` +
      newXML;
    try {
      await writeFile(plistPath, xmlToWrite, { encoding: 'utf-8' });
    } catch (e) {
      this.env.log.error(`Changes to Info.plist could not be written.`);
      this.printPlistInstructions(options);
    }
    this.env.log.ok(`cordova-plugin-ionic variables correctly added to the iOS project`);
  }

  protected async addConfToAndroidString(options: CommandLineOptions) {
    const stringXmlPath = await this.getAndroidCapString();
    if (!stringXmlPath) {
      this.env.log.warn(`The Android string.xml could not be found.`);
      this.printStringXmlInstructions(options);
      return;
    }
    // try to load the plist file first
    let stringData;
    try {
      const stringFile = await readFile(stringXmlPath);
      stringData = stringFile.toString();
    } catch (e) {
      this.env.log.error(`The Android string.xml could not be read.`);
      this.printStringXmlInstructions(options);
      return;
    }
    // parse it with elementtree
    let etree;
    try {
      etree = et.parse(stringData);
    } catch (e) {
      this.env.log.error(`Impossible to parse the XML in the string.xml`);
      this.printStringXmlInstructions(options);
      return;
    }
    // check that it is an actual string.xml file (root tag is resources)
    const root = etree.getroot();
    if (root.tag !== 'resources') {
      this.env.log.error(`string.xml is not a valid android string.xml file because the root is not a <resources> tag`);
      this.printStringXmlInstructions(options);
      return;
    }
    for (const [optionKey, stringKey] of Object.entries(this.optionsToStringXmlKeys)) {
      let element = root.find(`./string[@name="${stringKey}"]`);
      // if the tag already exists, just update the content
      if (element) {
        element.text = options[optionKey] as string;
      } else {
        // otherwise create the tag
        element = et.SubElement(root, 'string');
        element.set('name', stringKey);
        element.text = options[optionKey] as string;
      }
    }
    // write back the modified plist
    const newXML = etree.write({
      encoding: 'utf-8',
      indent: 2,
    });
    try {
      await writeFile(stringXmlPath, newXML, { encoding: 'utf-8' });
    } catch (e) {
      this.env.log.error(`Changes to string.xml could not be written.`);
      this.printStringXmlInstructions(options);
    }
    this.env.log.ok(`cordova-plugin-ionic variables correctly added to the Android project`);
  }

  protected async preRunCheckInputs(options: CommandLineOptions): Promise<void> {
    const updateMethodList: string[] = ['auto', 'background', 'none'];
    const defaultUpdateMethod = 'background';
    // handle the app-id option in case the user wants to override it
    if (!options['app-id']) {
      const appId = await this.getAppId();
      if (!appId) {
        this.env.log.warn(
          `No app ID found on the project: consider running ${input('ionic link')} to Connect local apps to Ionic`
        );
      }
      const appIdOption = await this.env.prompt({
        type: 'input',
        name: 'app-id',
        message: `Appflow app ID:`,
        default: appId,
      });
      options['app-id'] = appIdOption;
    }

    if (!options['channel-name']) {
      options['channel-name'] = await this.env.prompt({
        type: 'input',
        name: 'channel-name',
        message: `Channel Name:`,
        validate: v => validators.required(v),
      });
    }

    // validate that the update-method is allowed
    let overrideUpdateMethodChoice = false;
    if (options['update-method'] && !updateMethodList.includes(options['update-method'] as string)) {
      if (this.env.flags.interactive) {
        this.env.log.nl();
        this.env.log.warn(`--${input(options['update-method'] as string)} is not a valid update method; choose a valid one`);
      }
      overrideUpdateMethodChoice = true;
    }
    if (!options['update-method'] || overrideUpdateMethodChoice) {
      options['update-method'] = await this.env.prompt({
        type: 'list',
        name: 'update-method',
        choices: updateMethodList,
        message: `Update Method:`,
        default: defaultUpdateMethod,
        validate: v => validators.required(v) && contains(updateMethodList, {})(v),
      });
    }

    // check advanced options if present
    if (options['max-store'] && validators.numeric(options['max-store'] as string) !== true) {
      if (this.env.flags.interactive) {
        this.env.log.nl();
        this.env.log.warn(`--${input(options['max-store'] as string)} is not a valid Max Store value; please specify an integer`);
      }
      options['max-store'] = await this.env.prompt({
        type: 'input',
        name: 'max-store',
        message: `Max Store:`,
        validate: v => validators.required(v) && validators.numeric(v),
      });
    }

    if (options['min-background-duration'] && validators.numeric(options['min-background-duration'] as string) !== true) {
      if (this.env.flags.interactive) {
        this.env.log.nl();
        this.env.log.warn(`--${input(options['min-background-duration'] as string)} is not a valid Min Background Duration value; please specify an integer`);
      }
      options['min-background-duration'] = await this.env.prompt({
        type: 'input',
        name: 'min-background-duration',
        message: `Min Background Duration:`,
        validate: v => validators.required(v) && validators.numeric(v),
      });
    }
    if (options['update-api'] && validators.url(options['update-api'] as string) !== true) {
      if (this.env.flags.interactive) {
        this.env.log.nl();
        this.env.log.warn(`--${input(options['update-api'] as string)} is not a valid Update Api value; please specify a url`);
      }
      options['update-api'] = await this.env.prompt({
        type: 'input',
        name: 'update-api',
        message: `Update Url:`,
        validate: v => validators.required(v) && validators.url(v),
      });
    }
  }

}
