module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      diagnostics: {
        // warnOnly: true,
      },
      tsConfig: {
        types: [
          "node",
          "jest",
        ],
      },
    },
  },
};
