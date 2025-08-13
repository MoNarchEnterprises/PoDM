module.exports = {
  // Use the JSDOM environment to simulate a browser
  testEnvironment: 'jsdom',

  // Run the setup file to add browser APIs like TextEncoder
  setupFilesAfterEnv: ['./jest.setup.js'],

  // Explicitly tell Jest to use ts-jest for all .ts and .tsx files
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },

  // (Optional but recommended) Help Jest handle CSS imports if you have them
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};