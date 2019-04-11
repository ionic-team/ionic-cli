import { Colors, DEFAULT_COLORS, HelpColors } from '@ionic/cli-framework';
import chalk from 'chalk';

const HELP_COLORS: Partial<HelpColors> = {
  title: chalk.bold.rgb(0xFF, 0xFF, 0xFF).bgRgb(0x30, 0x75, 0xFF),
};

export const COLORS: Colors = { ...DEFAULT_COLORS, help: { ...DEFAULT_COLORS.help, ...HELP_COLORS } };

export const { strong, weak, input, success, failure, ancillary } = COLORS;
