/// <reference types="cypress" />

describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should show validation errors for invalid credentials', () => {
    // Test empty form submission
    cy.get('button[type="submit"]').click();
    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');

    // Test invalid email format
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid email format').should('be.visible');
  });

  it('should show error message for incorrect credentials', () => {
    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.contains('Incorrect email or password').should('be.visible');
  });

  it('should handle unauthorized access', () => {
    // Try to access protected route without auth
    cy.visit('/settings');
    cy.contains('Could not validate credentials').should('be.visible');
  });

  it('should successfully log in with valid credentials', () => {
    cy.get('input[name="email"]').type('admin@peerai.se');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();
    
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
    
    // Reload page
    cy.reload();
    
    // Should still be on dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('should successfully log out', () => {
    // Login first
    cy.get('input[name="email"]').type('admin@peerai.se');
    cy.get('input[name="password"]').type('admin123');
    cy.get('button[type="submit"]').click();
    
    // Click logout in user menu
    cy.get('[data-testid="user-menu"]').click();
    cy.contains('Logout').click();
    
    // Should redirect to login
    cy.url().should('include', '/login');
    
    // Should not allow access to protected routes
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });
}); 