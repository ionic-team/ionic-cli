export const BUILD_BEFORE_HOOK = 'build:before';
export const BUILD_AFTER_HOOK = 'build:after';

// npm script names
const npmPrefix = 'ionic';
export const BUILD_SCRIPT = `${npmPrefix}:build`;
export const BUILD_BEFORE_SCRIPT = `${npmPrefix}:${BUILD_BEFORE_HOOK}`;
export const BUILD_AFTER_SCRIPT = `${npmPrefix}:${BUILD_AFTER_HOOK}`;
