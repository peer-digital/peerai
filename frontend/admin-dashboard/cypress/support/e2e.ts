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
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
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