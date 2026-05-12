/**
 * Blockchain Service - Interact with EvidenceVault smart contract
 * Uses Polygon Mumbai Testnet (low gas fees)
 * 
 * Features:
 * - Environment validation and graceful degradation
 * - Automatic provider initialization
 * - Transaction retry logic
 * - Gas estimation and optimization
 * - Comprehensive error handling
 */

const { ethers } = require('ethers');
const { logEvent } = require('./coreServices');

// Contract ABI (Application Binary Interface)
const EVIDENCE_VAULT_ABI = [
  "function storeEvidence(string evidenceId, bytes32 fileHash, string evidenceType, string metadata) public",
  "function verifyEvidence(string evidenceId, bytes32 fileHash) public returns (bool)",
  "function getEvidence(string evidenceId) public view returns (bytes32 fileHash, address uploader, uint256 timestamp, string evidenceType, string metadata)",
  "function evidenceExists(string evidenceId) public view returns (bool)",
  "function getEvidenceCount() public view returns (uint256)",
  "event EvidenceStored(string indexed evidenceId, bytes32 indexed fileHash, address indexed uploader, uint256 timestamp, string evidenceType)"
];

// Configuration with validation
const POLYGON_MUMBAI_RPC = process.env.POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com";
const CONTRACT_ADDRESS = process.env.EVIDENCE_VAULT_CONTRACT || "";
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
const GAS_LIMIT_MULTIPLIER = parseFloat(process.env.BLOCKCHAIN_GAS_MULTIPLIER || "1.2");
const MAX_RETRY_ATTEMPTS = parseInt(process.env.BLOCKCHAIN_MAX_RETRIES || "3", 10);
const RETRY_DELAY_MS = parseInt(process.env.BLOCKCHAIN_RETRY_DELAY || "2000", 10);

// State
let provider = null;
let wallet = null;
let contract = null;
let isInitialized = false;
let initializationError = null;
let lastHealthCheck = null;

/**
 * Validate environment configuration
 */
function validateEnvironment() {
  const errors = [];
  
  if (!PRIVATE_KEY) {
    errors.push("BLOCKCHAIN_PRIVATE_KEY not configured");
  } else if (PRIVATE_KEY.length < 64) {
    errors.push("BLOCKCHAIN_PRIVATE_KEY appears invalid (too short)");
  }
  
  if (!CONTRACT_ADDRESS) {
    errors.push("EVIDENCE_VAULT_CONTRACT not configured");
  } else if (!ethers.isAddress(CONTRACT_ADDRESS)) {
    errors.push("EVIDENCE_VAULT_CONTRACT is not a valid Ethereum address");
  }
  
  if (!POLYGON_MUMBAI_RPC) {
    errors.push("POLYGON_RPC_URL not configured");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Initialize blockchain connection with validation
 */
function initializeBlockchain() {
  try {
    // Validate environment first
    const validation = validateEnvironment();
    
    if (!validation.valid) {
      const errorMsg = `Blockchain configuration invalid: ${validation.errors.join(', ')}`;
      logEvent("WARNING", errorMsg);
      initializationError = errorMsg;
      isInitialized = false;
      return false;
    }

    // Connect to Polygon Mumbai testnet
    provider = new ethers.JsonRpcProvider(POLYGON_MUMBAI_RPC, {
      name: "Polygon Mumbai",
      chainId: 80001
    });
    
    // Create wallet from private key
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Connect to contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, EVIDENCE_VAULT_ABI, wallet);
    
    isInitialized = true;
    initializationError = null;
    lastHealthCheck = Date.now();
    
    logEvent("INFO", "✅ Blockchain service initialized", { 
      network: "Polygon Mumbai",
      chainId: 80001,
      contract: CONTRACT_ADDRESS,
      wallet: wallet.address,
      gasMultiplier: GAS_LIMIT_MULTIPLIER,
      maxRetries: MAX_RETRY_ATTEMPTS
    });
    
    // Perform initial health check
    performHealthCheck().catch(err => {
      logEvent("WARN", "Initial blockchain health check failed", { error: err.message });
    });
    
    return true;
  } catch (error) {
    const errorMsg = `Failed to initialize blockchain service: ${error.message}`;
    logEvent("ERROR", errorMsg, { error: error.message, stack: error.stack });
    initializationError = errorMsg;
    isInitialized = false;
    return false;
  }
}

/**
 * Perform health check on blockchain connection
 */
async function performHealthCheck() {
  if (!provider || !wallet || !contract) {
    throw new Error("Blockchain not initialized");
  }
  
  try {
    // Check provider connection
    const network = await provider.getNetwork();
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    const balanceInMatic = ethers.formatEther(balance);
    
    // Warn if balance is low
    if (parseFloat(balanceInMatic) < 0.1) {
      logEvent("WARN", "Low blockchain wallet balance", { 
        balance: balanceInMatic + " MATIC",
        wallet: wallet.address
      });
    }
    
    // Check contract accessibility
    const evidenceCount = await contract.getEvidenceCount();
    
    lastHealthCheck = Date.now();
    
    logEvent("INFO", "Blockchain health check passed", {
      network: network.name,
      chainId: Number(network.chainId),
      balance: balanceInMatic + " MATIC",
      evidenceCount: Number(evidenceCount)
    });
    
    return {
      healthy: true,
      network: network.name,
      chainId: Number(network.chainId),
      balance: balanceInMatic,
      evidenceCount: Number(evidenceCount)
    };
  } catch (error) {
    logEvent("ERROR", "Blockchain health check failed", { error: error.message });
    throw error;
  }
}

/**
 * Ensure blockchain is initialized and healthy
 */
async function ensureInitialized() {
  if (!isInitialized) {
    const initialized = initializeBlockchain();
    if (!initialized) {
      throw new Error(initializationError || "Blockchain service not available");
    }
  }
  
  // Perform periodic health checks (every 5 minutes)
  const now = Date.now();
  if (!lastHealthCheck || (now - lastHealthCheck) > 5 * 60 * 1000) {
    try {
      await performHealthCheck();
    } catch (error) {
      logEvent("WARN", "Health check failed, blockchain may be unavailable", { error: error.message });
    }
  }
}

/**
 * Retry wrapper for blockchain operations
 */
async function retryOperation(operation, operationName, maxRetries = MAX_RETRY_ATTEMPTS) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.code === 'INSUFFICIENT_FUNDS' || 
          error.code === 'INVALID_ARGUMENT' ||
          error.message.includes('already exists')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        logEvent("WARN", `${operationName} failed, retrying...`, {
          attempt,
          maxRetries,
          error: error.message,
          retryIn: delay + 'ms'
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Estimate gas with safety margin
 */
async function estimateGasWithMargin(transaction) {
  try {
    const estimated = await transaction.estimateGas();
    const withMargin = Math.ceil(Number(estimated) * GAS_LIMIT_MULTIPLIER);
    return BigInt(withMargin);
  } catch (error) {
    logEvent("WARN", "Gas estimation failed, using default", { error: error.message });
    return BigInt(500000); // Default gas limit
  }
}

/**
 * Store evidence hash on blockchain with retry logic
 * @param {string} evidenceId - Unique evidence identifier (from Firebase)
 * @param {string} fileHash - SHA-256 hash of the file (hex string)
 * @param {string} evidenceType - Type of evidence (audio, video, location)
 * @param {object} metadata - Additional metadata (reason, location, etc.)
 * @returns {Promise<object>} Transaction receipt with txHash
 */
async function storeEvidenceOnChain(evidenceId, fileHash, evidenceType, metadata = {}) {
  await ensureInitialized();

  try {
    logEvent("INFO", "📝 Storing evidence on blockchain", { evidenceId, evidenceType });

    // Convert hex hash to bytes32
    const hashBytes32 = fileHash.startsWith('0x') ? fileHash : '0x' + fileHash;
    
    // Validate hash format
    if (hashBytes32.length !== 66) { // 0x + 64 hex chars
      throw new Error(`Invalid hash format: expected 66 characters, got ${hashBytes32.length}`);
    }
    
    // Convert metadata to JSON string (limit size)
    const metadataJson = JSON.stringify(metadata).substring(0, 1000); // Limit to 1KB

    // Check if evidence already exists
    const exists = await retryOperation(
      () => contract.evidenceExists(evidenceId),
      "Check evidence existence"
    );
    
    if (exists) {
      logEvent("WARNING", "Evidence already exists on blockchain", { evidenceId });
      const evidence = await contract.getEvidence(evidenceId);
      return {
        success: true,
        alreadyExists: true,
        evidenceId,
        blockchainHash: hashBytes32,
        timestamp: Number(evidence.timestamp),
        explorerUrl: `https://mumbai.polygonscan.com/address/${CONTRACT_ADDRESS}`
      };
    }

    // Prepare transaction
    const txData = contract.interface.encodeFunctionData("storeEvidence", [
      evidenceId,
      hashBytes32,
      evidenceType,
      metadataJson
    ]);

    // Estimate gas
    const gasLimit = await estimateGasWithMargin({
      to: CONTRACT_ADDRESS,
      data: txData,
      from: wallet.address
    });

    // Store on blockchain with retry
    const result = await retryOperation(async () => {
      const tx = await contract.storeEvidence(
        evidenceId,
        hashBytes32,
        evidenceType,
        metadataJson,
        { gasLimit }
      );

      logEvent("INFO", "⏳ Transaction submitted", { 
        txHash: tx.hash,
        gasLimit: gasLimit.toString()
      });

      // Wait for confirmation
      const receipt = await tx.wait();
      
      return receipt;
    }, "Store evidence transaction");

    logEvent("INFO", "✅ Evidence stored on blockchain", {
      evidenceId,
      txHash: result.hash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed.toString(),
      effectiveGasPrice: result.gasPrice ? ethers.formatUnits(result.gasPrice, 'gwei') + ' gwei' : 'N/A'
    });

    return {
      success: true,
      evidenceId,
      txHash: result.hash,
      blockNumber: result.blockNumber,
      blockchainHash: hashBytes32,
      gasUsed: result.gasUsed.toString(),
      gasPrice: result.gasPrice ? ethers.formatUnits(result.gasPrice, 'gwei') + ' gwei' : null,
      explorerUrl: `https://mumbai.polygonscan.com/tx/${result.hash}`
    };

  } catch (error) {
    logEvent("ERROR", "Failed to store evidence on blockchain", {
      evidenceId,
      error: error.message,
      code: error.code,
      reason: error.reason
    });
    throw error;
  }
}

/**
 * Verify evidence hash against blockchain with retry logic
 * @param {string} evidenceId - Evidence identifier
 * @param {string} fileHash - Hash to verify
 * @returns {Promise<object>} Verification result
 */
async function verifyEvidenceOnChain(evidenceId, fileHash) {
  await ensureInitialized();

  try {
    logEvent("INFO", "🔍 Verifying evidence on blockchain", { evidenceId });

    const hashBytes32 = fileHash.startsWith('0x') ? fileHash : '0x' + fileHash;

    // Check if evidence exists with retry
    const exists = await retryOperation(
      () => contract.evidenceExists(evidenceId),
      "Check evidence existence"
    );
    
    if (!exists) {
      return {
        success: false,
        verified: false,
        message: "Evidence not found on blockchain",
        evidenceId
      };
    }

    // Get evidence from blockchain with retry
    const evidence = await retryOperation(
      () => contract.getEvidence(evidenceId),
      "Get evidence details"
    );

    // Verify hash matches
    const isValid = evidence.fileHash.toLowerCase() === hashBytes32.toLowerCase();

    logEvent("INFO", isValid ? "✅ Evidence verified" : "❌ Evidence hash mismatch", {
      evidenceId,
      onChainHash: evidence.fileHash,
      providedHash: hashBytes32,
      match: isValid
    });

    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(evidence.metadata || '{}');
    } catch (e) {
      logEvent("WARN", "Failed to parse evidence metadata", { error: e.message });
    }

    return {
      success: true,
      verified: isValid,
      evidenceId,
      onChainHash: evidence.fileHash,
      providedHash: hashBytes32,
      uploader: evidence.uploader,
      timestamp: Number(evidence.timestamp),
      timestampDate: new Date(Number(evidence.timestamp) * 1000).toISOString(),
      evidenceType: evidence.evidenceType,
      metadata: parsedMetadata,
      explorerUrl: `https://mumbai.polygonscan.com/address/${CONTRACT_ADDRESS}`
    };

  } catch (error) {
    logEvent("ERROR", "Failed to verify evidence on blockchain", {
      evidenceId,
      error: error.message,
      code: error.code
    });
    throw error;
  }
}

/**
 * Get evidence details from blockchain with retry logic
 * @param {string} evidenceId - Evidence identifier
 * @returns {Promise<object>} Evidence details
 */
async function getEvidenceFromChain(evidenceId) {
  await ensureInitialized();

  try {
    const exists = await retryOperation(
      () => contract.evidenceExists(evidenceId),
      "Check evidence existence"
    );
    
    if (!exists) {
      return null;
    }

    const evidence = await retryOperation(
      () => contract.getEvidence(evidenceId),
      "Get evidence details"
    );

    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(evidence.metadata || '{}');
    } catch (e) {
      logEvent("WARN", "Failed to parse evidence metadata", { error: e.message });
    }

    return {
      evidenceId,
      fileHash: evidence.fileHash,
      uploader: evidence.uploader,
      timestamp: Number(evidence.timestamp),
      timestampDate: new Date(Number(evidence.timestamp) * 1000).toISOString(),
      evidenceType: evidence.evidenceType,
      metadata: parsedMetadata,
      explorerUrl: `https://mumbai.polygonscan.com/address/${CONTRACT_ADDRESS}`
    };

  } catch (error) {
    logEvent("ERROR", "Failed to get evidence from blockchain", {
      evidenceId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get wallet balance (for monitoring gas fees)
 * @returns {Promise<string>} Balance in MATIC
 */
async function getWalletBalance() {
  if (!isInitialized) {
    initializeBlockchain();
  }

  if (!wallet || !provider) {
    return "0";
  }

  try {
    const balance = await provider.getBalance(wallet.address);
    return ethers.formatEther(balance);
  } catch (error) {
    logEvent("ERROR", "Failed to get wallet balance", { error: error.message });
    return "0";
  }
}

/**
 * Check if blockchain service is available
 * @returns {boolean}
 */
function isBlockchainAvailable() {
  return isInitialized && contract !== null;
}

/**
 * Get blockchain network info
 * @returns {Promise<object>}
 */
async function getNetworkInfo() {
  if (!isInitialized) {
    initializeBlockchain();
  }

  if (!provider) {
    return {
      available: false,
      error: initializationError || "Blockchain not initialized",
      configured: {
        hasPrivateKey: !!PRIVATE_KEY,
        hasContractAddress: !!CONTRACT_ADDRESS,
        hasRpcUrl: !!POLYGON_MUMBAI_RPC
      }
    };
  }

  try {
    const network = await provider.getNetwork();
    const balance = await getWalletBalance();
    const evidenceCount = contract ? await contract.getEvidenceCount() : 0;

    return {
      available: true,
      network: network.name,
      chainId: Number(network.chainId),
      contractAddress: CONTRACT_ADDRESS,
      walletAddress: wallet ? wallet.address : null,
      balance: balance + " MATIC",
      totalEvidences: Number(evidenceCount),
      lastHealthCheck: lastHealthCheck ? new Date(lastHealthCheck).toISOString() : null,
      explorerUrl: `https://mumbai.polygonscan.com/address/${CONTRACT_ADDRESS}`,
      config: {
        gasMultiplier: GAS_LIMIT_MULTIPLIER,
        maxRetries: MAX_RETRY_ATTEMPTS,
        retryDelay: RETRY_DELAY_MS + 'ms'
      }
    };
  } catch (error) {
    logEvent("ERROR", "Failed to get network info", { error: error.message });
    return {
      available: false,
      error: error.message,
      lastHealthCheck: lastHealthCheck ? new Date(lastHealthCheck).toISOString() : null
    };
  }
}

/**
 * Get blockchain service status
 * @returns {object} Service status
 */
function getServiceStatus() {
  return {
    initialized: isInitialized,
    available: isBlockchainAvailable(),
    error: initializationError,
    lastHealthCheck: lastHealthCheck ? new Date(lastHealthCheck).toISOString() : null,
    configuration: {
      rpcUrl: POLYGON_MUMBAI_RPC,
      contractAddress: CONTRACT_ADDRESS,
      walletAddress: wallet ? wallet.address : null,
      gasMultiplier: GAS_LIMIT_MULTIPLIER,
      maxRetries: MAX_RETRY_ATTEMPTS
    }
  };
}

module.exports = {
  initializeBlockchain,
  storeEvidenceOnChain,
  verifyEvidenceOnChain,
  getEvidenceFromChain,
  getWalletBalance,
  isBlockchainAvailable,
  getNetworkInfo,
  getServiceStatus,
  performHealthCheck,
  validateEnvironment
};
