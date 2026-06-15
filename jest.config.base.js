module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: {},
        tsconfig: {
          types: ['node', 'jest'],
        },
      },
    ],
  },
};
