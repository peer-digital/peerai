/// <reference types="cypress" />
import '@testing-library/cypress/add-commands';

// Extend Cypress commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with email and password
       */
      login(email: string, password: string): Chainable<void>;
      /**
       * Custom command to check if an element has a specific permission
       */
      hasPermission(permission: string): Chainable<boolean>;
      /**
       * Custom command to wait for a named intercept
       */
      wait(alias: string): Chainable<void>;
      /**
       * Custom command to preserve session state
       */
      session(name: string, fn: () => void): Chainable<void>;
    }
  }
}

// Mock API responses
beforeEach(() => {
  // Mock successful login response
  cy.intercept('POST', '/auth/login', (req: any) => {
    const { username, password } = Object.fromEntries(new URLSearchParams(req.body));
    
    if (username === 'admin@peerai.se' && password === 'admin123') {
      req.reply({
        statusCode: 200,
        body: {
          access_token: 'mock_token',
          token_type: 'bearer'
        }
      });
    } else {
      req.reply({
        statusCode: 401,
        body: {
          detail: 'Incorrect email or password'
        }
      });
    }
  }).as('loginRequest');

  // Mock token validation response
  cy.intercept('GET', '/auth/validate', {
    statusCode: 200,
    body: {
      id: '1',
      email: 'admin@peerai.se',
      name: 'Admin User',
      role: 'admin'
    }
  }).as('validateToken');

  // Mock logout response
  cy.intercept('POST', '/auth/logout', {
    statusCode: 200,
    body: { message: 'Logged out successfully' }
  }).as('logoutRequest');
});

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  // Wait for login request to complete
  cy.wait('@loginRequest');
  // Wait for token validation
  cy.wait('@validateToken');
  // Wait for redirect and auth to complete
  cy.url().should('not.include', '/login');
});

// Permission check command
Cypress.Commands.add('hasPermission', (permission: string) => {
  return cy.window().its('store').invoke('getState').its('auth.user.permissions').then((permissions) => {
    return permissions.includes(permission);
  });
});

// Preserve auth state
beforeEach(() => {
  cy.session('user-session', () => {
    // Session will be preserved automatically
  });
}); 