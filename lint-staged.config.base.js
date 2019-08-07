const micromatch = require('micromatch');

module.exports = {
  '*.{ts,tsx}': files => micromatch
    .not(files, '**/__tests__/*.{ts,tsx}')
    .map(file => 'npm run lint'),
};
