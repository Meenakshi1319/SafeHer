/**
 * Blockchain Controller - API endpoints for blockchain operations
 * 
 * Provides endpoints for:
 * - Storing evidence on blockchain
 * - Verifying evidence integrity
 * - Retrieving blockchain network info
 * - Checking blockchain service status
 */

const express = require("express");
const blockchainService = require("../../services/blockchainService");
const { logEvent } = require("../../services/coreServices");

module.exports = function(middlewares) {
  const router = express.Router();

  /**
   * GET /blockchain/status
   * Get blockchain service status and configuration
   */
  router.get("/blockchain/status", middlewares.requireAuth, async (req, res) => {
    try {
      const networkInfo = await blockchainService.getNetworkInfo();
      
      res.status(200).json({
        success: true,
        blockchain: networkInfo
      });
    } catch (error) {
      logEvent("ERROR", "Failed to get blockchain status", { error: error.message });
      res.status(500).json({
        success: false,
        error: "Failed to retrieve blockchain status",
        message: error.message
      });
    }
  });

  /**
   * POST /blockchain/store-evidence
   * Store evidence hash on blockchain
   * 
   * Body:
   * - evidenceId: string (required) - Unique evidence identifier
   * - fileHash: string (required) - SHA-256 hash of the file
   * - evidenceType: string (required) - Type of evidence (audio, video, location)
   * - metadata: object (optional) - Additional metadata
   */
  router.post("/blockchain/store-evidence", middlewares.requireAuth, async (req, res) => {
    try {
      const { evidenceId, fileHash, evidenceType, metadata } = req.body;

      // Validation
      if (!evidenceId || !fileHash || !evidenceType) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
          required: ["evidenceId", "fileHash", "evidenceType"]
        });
      }

      // Check if blockchain is available
      if (!blockchainService.isBlockchainAvailable()) {
        logEvent("WARN", "Blockchain not available for evidence storage", { evidenceId });
        return res.status(503).json({
          success: false,
          error: "Blockchain service not available",
          message: "Evidence stored in database only. Blockchain integration requires configuration.",
          fallback: "database-only"
        });
      }

      // Store on blockchain
      const result = await blockchainService.storeEvidenceOnChain(
        evidenceId,
        fileHash,
        evidenceType,
        metadata || {}
      );

      logEvent("INFO", "Evidence stored on blockchain via API", {
        evidenceId,
        txHash: result.txHash,
        userId: req.user.uid
      });

      res.status(200).json({
        success: true,
        message: "Evidence stored on blockchain",
        blockchain: result
      });

    } catch (error) {
      logEvent("ERROR", "Failed to store evidence on blockchain", {
        error: error.message,
        userId: req.user?.uid
      });

      res.status(500).json({
        success: false,
        error: "Failed to store evidence on blockchain",
        message: error.message,
        fallback: "Evidence stored in database only"
      });
    }
  });

  /**
   * POST /blockchain/verify-evidence
   * Verify evidence hash against blockchain
   * 
   * Body:
   * - evidenceId: string (required) - Evidence identifier
   * - fileHash: string (required) - Hash to verify
   */
  router.post("/blockchain/verify-evidence", middlewares.requireAuth, async (req, res) => {
    try {
      const { evidenceId, fileHash } = req.body;

      // Validation
      if (!evidenceId || !fileHash) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
          required: ["evidenceId", "fileHash"]
        });
      }

      // Check if blockchain is available
      if (!blockchainService.isBlockchainAvailable()) {
        return res.status(503).json({
          success: false,
          error: "Blockchain service not available",
          message: "Cannot verify evidence without blockchain connection"
        });
      }

      // Verify on blockchain
      const result = await blockchainService.verifyEvidenceOnChain(evidenceId, fileHash);

      logEvent("INFO", "Evidence verified via API", {
        evidenceId,
        verified: result.verified,
        userId: req.user.uid
      });

      res.status(200).json({
        success: true,
        verification: result
      });

    } catch (error) {
      logEvent("ERROR", "Failed to verify evidence on blockchain", {
        error: error.message,
        userId: req.user?.uid
      });

      res.status(500).json({
        success: false,
        error: "Failed to verify evidence",
        message: error.message
      });
    }
  });

  /**
   * GET /blockchain/evidence/:evidenceId
   * Get evidence details from blockchain
   */
  router.get("/blockchain/evidence/:evidenceId", middlewares.requireAuth, async (req, res) => {
    try {
      const { evidenceId } = req.params;

      // Check if blockchain is available
      if (!blockchainService.isBlockchainAvailable()) {
        return res.status(503).json({
          success: false,
          error: "Blockchain service not available"
        });
      }

      // Get evidence from blockchain
      const evidence = await blockchainService.getEvidenceFromChain(evidenceId);

      if (!evidence) {
        return res.status(404).json({
          success: false,
          error: "Evidence not found on blockchain",
          evidenceId
        });
      }

      res.status(200).json({
        success: true,
        evidence
      });

    } catch (error) {
      logEvent("ERROR", "Failed to get evidence from blockchain", {
        error: error.message,
        evidenceId: req.params.evidenceId
      });

      res.status(500).json({
        success: false,
        error: "Failed to retrieve evidence",
        message: error.message
      });
    }
  });

  /**
   * GET /blockchain/wallet/balance
   * Get wallet balance (for monitoring gas fees)
   */
  router.get("/blockchain/wallet/balance", middlewares.requireAuth, middlewares.requireAdmin, async (req, res) => {
    try {
      const balance = await blockchainService.getWalletBalance();

      res.status(200).json({
        success: true,
        balance: balance + " MATIC",
        network: "Polygon Mumbai"
      });

    } catch (error) {
      logEvent("ERROR", "Failed to get wallet balance", { error: error.message });

      res.status(500).json({
        success: false,
        error: "Failed to retrieve wallet balance",
        message: error.message
      });
    }
  });

  /**
   * POST /blockchain/health-check
   * Perform blockchain health check
   */
  router.post("/blockchain/health-check", middlewares.requireAuth, middlewares.requireAdmin, async (req, res) => {
    try {
      const health = await blockchainService.performHealthCheck();

      res.status(200).json({
        success: true,
        health
      });

    } catch (error) {
      logEvent("ERROR", "Blockchain health check failed", { error: error.message });

      res.status(500).json({
        success: false,
        error: "Health check failed",
        message: error.message
      });
    }
  });

  return router;
};
