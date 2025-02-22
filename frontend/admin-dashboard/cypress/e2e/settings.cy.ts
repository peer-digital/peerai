describe('Settings Management', () => {
  beforeEach(() => {
    // Login as admin before each test
    cy.login('admin@peerai.se', 'admin123');
    cy.visit('/settings');
  });

  it('should load settings page with current configuration', () => {
    // Check if all sections are visible
    cy.contains('Rate Limiting').should('be.visible');
    cy.contains('Security').should('be.visible');
    cy.contains('Model Configuration').should('be.visible');
    cy.contains('Beta Features').should('be.visible');
    cy.contains('Monitoring').should('be.visible');

    // Check if form is populated with data
    cy.get('input[name="rateLimit.requestsPerMinute"]').should('have.value');
    cy.get('input[name="security.maxTokenLength"]').should('have.value');
    cy.get('input[name="models.defaultModel"]').should('have.value');
  });

  it('should update rate limiting settings', () => {
    // Update rate limiting settings
    cy.get('input[name="rateLimit.enabled"]').click();
    cy.get('input[name="rateLimit.requestsPerMinute"]').clear().type('100');
    cy.get('input[name="rateLimit.tokensPerDay"]').clear().type('1000');
    
    // Save changes
    cy.get('button[type="submit"]').click();
    
    // Check success message
    cy.contains('Settings updated successfully').should('be.visible');
    
    // Reload page and verify persistence
    cy.reload();
    cy.get('input[name="rateLimit.requestsPerMinute"]').should('have.value', '100');
    cy.get('input[name="rateLimit.tokensPerDay"]').should('have.value', '1000');
  });

  it('should manage beta features', () => {
    // Enable Vision API
    cy.get('input[name="betaFeatures.visionEnabled"]').click();
    cy.get('input[name="betaFeatures.visionModel"]')
      .should('be.enabled')
      .type('claude-3-opus-20240229');
    
    // Enable Audio API
    cy.get('input[name="betaFeatures.audioEnabled"]').click();
    cy.get('input[name="betaFeatures.audioModel"]')
      .should('be.enabled')
      .type('whisper-1');
    
    // Save changes
    cy.get('button[type="submit"]').click();
    cy.contains('Settings updated successfully').should('be.visible');
  });

  it('should validate security settings', () => {
    // Try invalid origin format
    cy.get('input[name="security.allowedOrigins"]').clear().type('invalid-origin');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid origin format').should('be.visible');

    // Enter valid origins
    cy.get('input[name="security.allowedOrigins"]')
      .clear()
      .type('https://app.peerai.se, https://api.peerai.se');
    cy.get('button[type="submit"]').click();
    cy.contains('Settings updated successfully').should('be.visible');
  });

  it('should handle model configuration', () => {
    // Update model settings
    cy.get('input[name="models.defaultModel"]')
      .clear()
      .type('claude-3-sonnet-20240229');
    cy.get('input[name="models.maxContextLength"]')
      .clear()
      .type('200000');
    cy.get('input[name="models.temperature"]')
      .clear()
      .type('0.7');
    
    // Save changes
    cy.get('button[type="submit"]').click();
    cy.contains('Settings updated successfully').should('be.visible');
  });

  it('should restrict access for non-admin users', () => {
    // Logout
    cy.get('[data-testid="user-menu"]').click();
    cy.contains('Logout').click();
    
    // Login as regular user
    cy.login('user@peerai.se', 'user123');
    
    // Try to access settings
    cy.visit('/settings');
    
    // Should be redirected to unauthorized page
    cy.url().should('include', '/unauthorized');
    cy.contains('Access Denied').should('be.visible');
  });
}); 