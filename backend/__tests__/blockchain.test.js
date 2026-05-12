/**
 * Blockchain Service Tests
 * 
 * Tests for blockchain integration including environment validation,
 * evidence storage, verification, and graceful degradation.
 */

const blockchainService = require('../src/services/blockchainService');

describe('Blockchain Service', () => {
  describe('Environment Validation', () => {
    test('should validate environment configuration', () => {
      const validation = blockchainService.validateEnvironment();
      
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('errors');
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
    });

    test('should identify missing configuration', () => {
      const validation = blockchainService.validateEnvironment();
      
      if (!validation.valid) {
        expect(validation.errors.length).toBeGreaterThan(0);
        validation.errors.forEach(error => {
          expect(typeof error).toBe('string');
        });
      }
    });
  });

  describe('Service Status', () => {
    test('should return service status', () => {
      const status = blockchainService.getServiceStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('configuration');
      expect(typeof status.initialized).toBe('boolean');
      expect(typeof status.available).toBe('boolean');
    });

    test('should include configuration details', () => {
      const status = blockchainService.getServiceStatus();
      
      expect(status.configuration).toHaveProperty('rpcUrl');
      expect(status.configuration).toHaveProperty('contractAddress');
      expect(status.configuration).toHaveProperty('gasMultiplier');
      expect(status.configuration).toHaveProperty('maxRetries');
    });
  });

  describe('Network Info', () => {
    test('should return network information', async () => {
      const networkInfo = await blockchainService.getNetworkInfo();
      
      expect(networkInfo).toHaveProperty('available');
      expect(typeof networkInfo.available).toBe('boolean');
      
      if (!networkInfo.available) {
        expect(networkInfo).toHaveProperty('error');
        expect(networkInfo).toHaveProperty('configured');
      }
    });

    test('should handle unavailable blockchain gracefully', async () => {
      const networkInfo = await blockchainService.getNetworkInfo();
      
      if (!networkInfo.available) {
        expect(networkInfo.configured).toHaveProperty('hasPrivateKey');
        expect(networkInfo.configured).toHaveProperty('hasContractAddress');
        expect(networkInfo.configured).toHaveProperty('hasRpcUrl');
      }
    });
  });

  describe('Availability Check', () => {
    test('should check if blockchain is available', () => {
      const available = blockchainService.isBlockchainAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('Wallet Balance', () => {
    test('should return wallet balance', async () => {
      const balance = await blockchainService.getWalletBalance();
      
      expect(typeof balance).toBe('string');
      expect(balance).toMatch(/^\d+(\.\d+)?$/); // Should be a number string
    });

    test('should return 0 when not initialized', async () => {
      if (!blockchainService.isBlockchainAvailable()) {
        const balance = await blockchainService.getWalletBalance();
        expect(balance).toBe('0');
      }
    });
  });

  describe('Evidence Storage (when available)', () => {
    test('should handle storage attempt gracefully', async () => {
      if (!blockchainService.isBlockchainAvailable()) {
        // Should throw error when not available
        await expect(
          blockchainService.storeEvidenceOnChain(
            'test-evidence-id',
            '0x' + '0'.repeat(64),
            'audio',
            { test: true }
          )
        ).rejects.toThrow();
      } else {
        // If available, should attempt storage
        // Note: This will fail without testnet MATIC, but should not crash
        try {
          await blockchainService.storeEvidenceOnChain(
            'test-evidence-id-' + Date.now(),
            '0x' + '0'.repeat(64),
            'audio',
            { test: true }
          );
        } catch (error) {
          // Expected to fail without gas, but should have proper error
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    test('should validate hash format', async () => {
      if (blockchainService.isBlockchainAvailable()) {
        await expect(
          blockchainService.storeEvidenceOnChain(
            'test-id',
            'invalid-hash',
            'audio',
            {}
          )
        ).rejects.toThrow(/Invalid hash format/);
      }
    });
  });

  describe('Evidence Verification (when available)', () => {
    test('should handle verification attempt gracefully', async () => {
      if (!blockchainService.isBlockchainAvailable()) {
        await expect(
          blockchainService.verifyEvidenceOnChain(
            'test-evidence-id',
            '0x' + '0'.repeat(64)
          )
        ).rejects.toThrow();
      } else {
        // Should return not found for non-existent evidence
        const result = await blockchainService.verifyEvidenceOnChain(
          'non-existent-evidence',
          '0x' + '0'.repeat(64)
        );
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('verified');
        expect(result.verified).toBe(false);
      }
    });
  });

  describe('Evidence Retrieval (when available)', () => {
    test('should handle retrieval attempt gracefully', async () => {
      if (!blockchainService.isBlockchainAvailable()) {
        await expect(
          blockchainService.getEvidenceFromChain('test-evidence-id')
        ).rejects.toThrow();
      } else {
        // Should return null for non-existent evidence
        const result = await blockchainService.getEvidenceFromChain(
          'non-existent-evidence'
        );
        
        expect(result).toBeNull();
      }
    });
  });

  describe('Health Check (when available)', () => {
    test('should perform health check', async () => {
      if (!blockchainService.isBlockchainAvailable()) {
        await expect(
          blockchainService.performHealthCheck()
        ).rejects.toThrow();
      } else {
        const health = await blockchainService.performHealthCheck();
        
        expect(health).toHaveProperty('healthy');
        expect(health).toHaveProperty('network');
        expect(health).toHaveProperty('chainId');
        expect(health).toHaveProperty('balance');
        expect(health).toHaveProperty('evidenceCount');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', () => {
      // Should not crash even with invalid config
      expect(() => blockchainService.initializeBlockchain()).not.toThrow();
    });

    test('should provide meaningful error messages', async () => {
      if (!blockchainService.isBlockchainAvailable()) {
        const status = blockchainService.getServiceStatus();
        
        if (status.error) {
          expect(typeof status.error).toBe('string');
          expect(status.error.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Configuration', () => {
    test('should expose configuration values', () => {
      const status = blockchainService.getServiceStatus();
      
      expect(status.configuration.gasMultiplier).toBeGreaterThan(1);
      expect(status.configuration.maxRetries).toBeGreaterThan(0);
    });
  });
});
