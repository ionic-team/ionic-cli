import chalk from 'chalk';

export const timestamp = () => chalk.dim(`[${new Date().toTimeString().slice(0, 8)}]`);
