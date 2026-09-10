/** Component render smoke tests. Domain/unit tests run separately via `npm test` (tsx). */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/*.rtest.tsx'],
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/jest.css-stub.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@supabase/.*|expo-router|@expo/vector-icons))',
  ],
};
