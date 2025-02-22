import { defineConfig } from 'cypress';
import webpackPreprocessor from '@cypress/webpack-preprocessor';
import webpackConfig from './cypress/webpack.config';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // Vite's current dev server port
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      on('file:preprocessor', webpackPreprocessor({ webpackOptions: webpackConfig }));
      return config;
    },
  },
}); 