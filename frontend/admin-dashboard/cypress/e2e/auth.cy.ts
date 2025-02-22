/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    intercept(url: string, response?: any): Chainable<any>
    intercept(method: string, url: string, response?: any): Chainable<any>
    intercept(method: string, url: string, handler: (req: any) => void): Chainable<any>
  }
}

describe('Authentication', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('POST', '/api/v1/token', (req: any) => {
      const formData = new URLSearchParams(req.body);
      const username = formData.get('username');
      const password = formData.get('password');
      
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

    cy.intercept('GET', '/api/v1/auth/validate', {
      statusCode: 200,
      body: {
        id: '1',
        email: 'admin@peerai.se',
        name: 'Admin User',
        role: 'admin'
      }
    }).as('validateToken');

    cy.visit('/login');
  });

  it('should show validation errors for invalid credentials', () => {
    // Test empty form submission
    cy.get('button[type="submit"]').click();
    cy.get('input[name="email"]').should('have.attr', 'aria-invalid', 'true');
    cy.get('input[name="password"]').should('have.attr', 'aria-invalid', 'true');
    cy.get('p.MuiFormHelperText-root').should('contain', 'Email is required');
    cy.get('p.MuiFormHelperText-root').should('contain', 'Password is required');

    // Test invalid email format
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.get('p.MuiFormHelperText-root').should('contain', 'Invalid email address');
  });

  it('should show error message for incorrect credentials', () => {
    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.wait('@loginRequest');
    // Wait for error alert to appear and verify its content
    cy.get('.MuiAlert-root[role="alert"]')
      .should('exist')
      .and('have.attr', 'severity', 'error')
      .and('contain', 'Incorrect email or password');
  });

  it('should handle unauthorized access', () => {
    // Try to access protected route without auth
    cy.visit('/settings');
    cy.url().should('include', '/login');
  });

  it('should successfully log in with valid credentials', () => {
    cy.get('input[name="email"]').type('admin@peerai.se');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();
    cy.wait('@loginRequest');
    cy.wait('@validateToken');
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');
    
    // Should show user menu
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('should maintain session after page reload', () => {
    // Login first
    cy.get('input[name="email"]').type('admin@peerai.se');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();
    cy.wait('@loginRequest');
    cy.wait('@validateToken');
    
    // Reload page
    cy.reload();
    cy.wait('@validateToken');
    
    // Should still be on dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('should successfully log out', () => {
    // Login first
    cy.get('input[name="email"]').type('admin@peerai.se');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();
    cy.wait('@loginRequest');
    cy.wait('@validateToken');
    
    // Click logout in user menu (force click to bypass any overlays)
    cy.get('[data-testid="user-menu"]').click({ force: true });
    cy.contains('Logout').click();
    
    // Should redirect to login
    cy.url().should('include', '/login');
    
    // Should not allow access to protected routes
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });
}); 