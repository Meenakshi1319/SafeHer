/**
 * Blockchain Service - Interact with EvidenceVault smart contract
 * Uses Polygon Mumbai Testnet (low gas fees)
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

// Configuration
const POLYGON_MUMBAI_RPC = process.env.POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com";
const CONTRACT_ADDRESS = process.env.EVIDENCE_VAULT_CONTRACT || ""; // Will be set after deployment
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || "";

let provider = null;
let wallet = null;
let contract = null;
let isInitialized = false;

/**
 * Initialize blockchain connection
 */
function initializeBlockchain() {
  try {
    if (!PRIVATE_KEY) {
      logEvent("WARNING", "Blockchain private key not configured - blockchain features disabled");
      return false;
    }

    if (!CONTRACT_ADDRESS) {
      logEvent("WARNING", "Evidence vault contract address not configured - blockchain features disabled");
      return false;
    }

    // Connect to Polygon Mumbai testnet
    provider = new ethers.JsonRpcProvider(POLYGON_MUMBAI_RPC);
    
    // Create wallet from private key
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Connect to contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, EVIDENCE_VAULT_ABI, wallet);
    
    isInitialized = true;
    logEvent("INFO", "✅ Blockchain service initialized", { 
      network: "Polygon Mumbai",
      contract: CONTRACT_ADDRESS,
      wallet: wallet.address 
    });
    
    return true;
  } catch (error) {
    logEvent("ERROR", "Failed to initialize blockchain service", { error: error.message });
    return false;
  }
}

/**
 * Store evidence hash on blockchain
 * @param {string} evidenceId - Unique evidence identifier (from Firebase)
 * @param {string} fileHash - SHA-256 hash of the file (hex string)
 * @param {string} evidenceType - Type of evidence (audio, video, location)
 * @param {object} metadata - Additional metadata (reason, location, etc.)
 * @returns {Promise<object>} Transaction receipt with txHash
 */
async function storeEvidenceOnChain(evidenceId, fileHash, evidenceType, metadata = {}) {
  if (!isInitialized) {
    const initialized = initializeBlockchain();
    if (!initialized) {
      throw new Error("Blockchain service not available");
    }
  }

  try {
    logEvent("INFO", "📝 Storing evidence on blockchain", { evidenceId, evidenceType });

    // Convert hex hash to bytes32
    const hashBytes32 = fileHash.startsWith('0x') ? fileHash : '0x' + fileHash;
    
    // Convert metadata to JSON string
    const metadataJson = JSON.stringify(metadata);

    // Check if evidence already exists
    const exists = await contract.evidenceExists(evidenceId);
    if (exists) {
      logEvent("WARNING", "Evidence already exists on blockchain", { evidenceId });
      // Get existing evidence to return transaction hash
      const evidence = await contract.getEvidence(evidenceId);
      return {
        success: true,
        alreadyExists: true,
        evidenceId,
        blockchainHash: hashBytes32,
        timestamp: Number(evidence.timestamp)
      };
    }

    // Store on blockchain
    const tx = await contract.storeEvidence(
      evidenceId,
      hashBytes32,
      evidenceType,
      metadataJson
    );

    logEvent("INFO", "⏳ Transaction submitted", { txHash: tx.hash });

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    logEvent("INFO", "✅ Evidence stored on blockchain", {
      evidenceId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return {
      success: true,
      evidenceId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockchainHash: hashBytes32,
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl: `https://mumbai.polygonscan.com/tx/${receipt.hash}`
    };

  } catch (error) {
    logEvent("ERROR", "Failed to store evidence on blockchain", {
      evidenceId,
      error: error.message,
      code: error.code
    });
    throw error;
  }
}

/**
 * Verify evidence hash against blockchain
 * @param {string} evidenceId - Evidence identifier
 * @param {string} fileHash - Hash to verify
 * @returns {Promise<object>} Verification result
 */
async function verifyEvidenceOnChain(evidenceId, fileHash) {
  if (!isInitialized) {
    const initialized = initializeBlockchain();
    if (!initialized) {
      throw new Error("Blockchain service not available");
    }
  }

  try {
    logEvent("INFO", "🔍 Verifying evidence on blockchain", { evidenceId });

    const hashBytes32 = fileHash.startsWith('0x') ? fileHash : '0x' + fileHash;

    // Check if evidence exists
    const exists = await contract.evidenceExists(evidenceId);
    if (!exists) {
      return {
        success: false,
        verified: false,
        message: "Evidence not found on blockchain"
      };
    }

    // Get evidence from blockchain
    const evidence = await contract.getEvidence(evidenceId);

    // Verify hash matches
    const isValid = evidence.fileHash.toLowerCase() === hashBytes32.toLowerCase();

    logEvent("INFO", isValid ? "✅ Evidence verified" : "❌ Evidence hash mismatch", {
      evidenceId,
      onChainHash: evidence.fileHash,
      providedHash: hashBytes32
    });

    return {
      success: true,
      verified: isValid,
      evidenceId,
      onChainHash: evidence.fileHash,
      uploader: evidence.uploader,
      timestamp: Number(evidence.timestamp),
      evidenceType: evidence.evidenceType,
      metadata: JSON.parse(evidence.metadata || '{}'),
      explorerUrl: `https://mumbai.polygonscan.com/address/${CONTRACT_ADDRESS}`
    };

  } catch (error) {
    logEvent("ERROR", "Failed to verify evidence on blockchain", {
      evidenceId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get evidence details from blockchain
 * @param {string} evidenceId - Evidence identifier
 * @returns {Promise<object>} Evidence details
 */
async function getEvidenceFromChain(evidenceId) {
  if (!isInitialized) {
    const initialized = initializeBlockchain();
    if (!initialized) {
      throw new Error("Blockchain service not available");
    }
  }

  try {
    const exists = await contract.evidenceExists(evidenceId);
    if (!exists) {
      return null;
    }

    const evidence = await contract.getEvidence(evidenceId);

    return {
      evidenceId,
      fileHash: evidence.fileHash,
      uploader: evidence.uploader,
      timestamp: Number(evidence.timestamp),
      evidenceType: evidence.evidenceType,
      metadata: JSON.parse(evidence.metadata || '{}'),
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

  if (!wallet) {
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
    return null;
  }

  try {
    const network = await provider.getNetwork();
    const balance = await getWalletBalance();
    const evidenceCount = contract ? await contract.getEvidenceCount() : 0;

    return {
      network: network.name,
      chainId: Number(network.chainId),
      contractAddress: CONTRACT_ADDRESS,
      walletAddress: wallet ? wallet.address : null,
      balance: balance + " MATIC",
      totalEvidences: Number(evidenceCount),
      explorerUrl: `https://mumbai.polygonscan.com/address/${CONTRACT_ADDRESS}`
    };
  } catch (error) {
    logEvent("ERROR", "Failed to get network info", { error: error.message });
    return null;
  }
}

module.exports = {
  initializeBlockchain,
  storeEvidenceOnChain,
  verifyEvidenceOnChain,
  getEvidenceFromChain,
  getWalletBalance,
  isBlockchainAvailable,
  getNetworkInfo
};
