describe('Permission-based Access Control', () => {
  describe('Super Admin Access', () => {
    beforeEach(() => {
      cy.login('super.admin@peerai.se', 'testpass123');
    });

    it('should have access to all features', () => {
      // Check user management access
      cy.visit('/users');
      cy.url().should('include', '/users');
      cy.contains('User Management').should('be.visible');
      cy.contains('Add User').should('be.visible');

      // Check settings access
      cy.visit('/settings');
      cy.url().should('include', '/settings');
      cy.contains('System Settings').should('be.visible');

      // Check analytics access
      cy.visit('/analytics');
      cy.url().should('include', '/analytics');
      cy.contains('Analytics Dashboard').should('be.visible');
      cy.contains('Export Data').should('be.visible');

      // Check beta features access
      cy.visit('/settings');
      cy.contains('Beta Features').should('be.visible');
      cy.get('input[name="betaFeatures.visionEnabled"]').should('exist');
    });
  });

  describe('Admin Access', () => {
    beforeEach(() => {
      cy.login('admin@peerai.se', 'admin123');
    });

    it('should have access to most features except super admin functions', () => {
      // Check user management access
      cy.visit('/users');
      cy.url().should('include', '/users');
      cy.contains('User Management').should('be.visible');
      
      // Check settings access
      cy.visit('/settings');
      cy.url().should('include', '/settings');
      cy.contains('System Settings').should('be.visible');
      
      // Check analytics access
      cy.visit('/analytics');
      cy.url().should('include', '/analytics');
      cy.contains('Analytics Dashboard').should('be.visible');
    });
  });

  describe('Manager Access', () => {
    beforeEach(() => {
      cy.login('manager@peerai.se', 'testpass123');
    });

    it('should have limited access to features', () => {
      // Should be able to view users but not edit
      cy.visit('/users');
      cy.url().should('include', '/users');
      cy.contains('User Management').should('be.visible');
      cy.contains('Add User').should('not.exist');

      // Should not have access to settings
      cy.visit('/settings');
      cy.contains('Not authorized').should('be.visible');
      
      // Should have access to analytics
      cy.visit('/analytics');
      cy.url().should('include', '/analytics');
      cy.contains('Analytics Dashboard').should('be.visible');
      cy.contains('Export Data').should('not.exist');
    });

    it('should have access to beta features when enabled', () => {
      // Visit API page
      cy.visit('/api');
      cy.contains('Vision API').should('be.visible');
      cy.contains('Audio API').should('be.visible');
      
      // Should see beta labels
      cy.get('[data-testid="beta-badge"]').should('have.length.at.least', 2);
    });
  });

  describe('Regular User Access', () => {
    beforeEach(() => {
      cy.login('test@example.com', 'testpass123');
    });

    it('should have minimal access', () => {
      // Should not access user management
      cy.visit('/users');
      cy.contains('Not authorized').should('be.visible');

      // Should not access settings
      cy.visit('/settings');
      cy.contains('Not authorized').should('be.visible');

      // Should not access analytics
      cy.visit('/analytics');
      cy.contains('Not authorized').should('be.visible');
    });

    it('should only manage own API keys', () => {
      // Visit API keys page
      cy.visit('/api-keys');
      cy.url().should('include', '/api-keys');
      
      // Should see own API keys
      cy.contains('Your API Keys').should('be.visible');
      cy.contains('Create New Key').should('be.visible');
      
      // Should not see other users' keys
      cy.contains('All API Keys').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid permissions gracefully', () => {
      // Try to access with invalid token
      cy.visit('/settings');
      cy.contains('Could not validate credentials').should('be.visible');
      
      // Try to access with expired token
      cy.login('manager@peerai.se', 'testpass123');
      // Simulate token expiration
      cy.window().then((win) => {
        win.localStorage.removeItem('access_token');
      });
      cy.visit('/settings');
      cy.contains('Could not validate credentials').should('be.visible');
    });
  });
}); 