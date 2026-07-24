module.exports = {
  // Use the Node environment for backend testing
  testEnvironment: 'node',

  // Run the setup file to add browser APIs like TextEncoder (if needed, though node usually has them)
  setupFilesAfterEnv: ['./jest.setup.js'],

  // Exclude Hardhat contracts and compiled dist folders from the root Jest run
  testPathIgnorePatterns: ['/node_modules/', '/contracts/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/contracts/', '<rootDir>/dist/'],

  // Explicitly tell Jest to use ts-jest for all .ts and .tsx files
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },

  // (Optional but recommended) Help Jest handle CSS imports if you have them
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};