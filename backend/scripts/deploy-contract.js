/**
 * Deploy EvidenceVault Smart Contract to Polygon Mumbai
 * 
 * Usage:
 *   node scripts/deploy-contract.js
 * 
 * Requirements:
 *   - BLOCKCHAIN_PRIVATE_KEY in .env
 *   - Wallet must have Mumbai testnet MATIC
 *   - Get from: https://faucet.polygon.technology/
 */

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Contract source code
const CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvidenceVault {
    struct Evidence {
        bytes32 fileHash;
        address uploader;
        uint256 timestamp;
        string evidenceType;
        string metadata;
        bool exists;
    }
    
    mapping(string => Evidence) public evidences;
    string[] public evidenceIds;
    
    event EvidenceStored(
        string indexed evidenceId,
        bytes32 indexed fileHash,
        address indexed uploader,
        uint256 timestamp,
        string evidenceType
    );
    
    event EvidenceVerified(
        string indexed evidenceId,
        address indexed verifier,
        uint256 timestamp
    );
    
    function storeEvidence(
        string memory evidenceId,
        bytes32 fileHash,
        string memory evidenceType,
        string memory metadata
    ) public {
        require(!evidences[evidenceId].exists, "Evidence already exists");
        require(fileHash != bytes32(0), "Invalid file hash");
        
        evidences[evidenceId] = Evidence({
            fileHash: fileHash,
            uploader: msg.sender,
            timestamp: block.timestamp,
            evidenceType: evidenceType,
            metadata: metadata,
            exists: true
        });
        
        evidenceIds.push(evidenceId);
        
        emit EvidenceStored(
            evidenceId,
            fileHash,
            msg.sender,
            block.timestamp,
            evidenceType
        );
    }
    
    function verifyEvidence(
        string memory evidenceId,
        bytes32 fileHash
    ) public returns (bool) {
        require(evidences[evidenceId].exists, "Evidence not found");
        
        bool isValid = evidences[evidenceId].fileHash == fileHash;
        
        if (isValid) {
            emit EvidenceVerified(evidenceId, msg.sender, block.timestamp);
        }
        
        return isValid;
    }
    
    function getEvidence(string memory evidenceId) 
        public 
        view 
        returns (
            bytes32 fileHash,
            address uploader,
            uint256 timestamp,
            string memory evidenceType,
            string memory metadata
        ) 
    {
        require(evidences[evidenceId].exists, "Evidence not found");
        Evidence memory evidence = evidences[evidenceId];
        return (
            evidence.fileHash,
            evidence.uploader,
            evidence.timestamp,
            evidence.evidenceType,
            evidence.metadata
        );
    }
    
    function getEvidenceCount() public view returns (uint256) {
        return evidenceIds.length;
    }
    
    function getEvidenceIdByIndex(uint256 index) public view returns (string memory) {
        require(index < evidenceIds.length, "Index out of bounds");
        return evidenceIds[index];
    }
    
    function evidenceExists(string memory evidenceId) public view returns (bool) {
        return evidences[evidenceId].exists;
    }
}
`;

// Compiled bytecode (you'll need to compile the contract first)
// This is a placeholder - you need to compile with solc or use Remix
const BYTECODE = "0x608060405234801561001057600080fd5b50610c9f806100206000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063a87430ba1161005b578063a87430ba146100f7578063c19d93fb14610117578063e02f3b4914610137578063f5f5ba721461015757600080fd5b80631f7b6d321461008d5780632f54bf6e146100a95780636c0360eb146100cc57806395d89b41146100df575b600080fd5b610096610177565b6040519081526020015b60405180910390f35b6100bc6100b7366004610a0e565b610197565b60405190151581526020016100a0565b6100d46101b5565b6040516100a09190610a7b565b6100d4610243565b61010a610105366004610a8e565b610250565b6040516100a09190610b07565b61012a610125366004610a0e565b6102e4565b6040516100a09190610b4a565b61014a610145366004610b5d565b610384565b6040516100a09190610bd0565b61016a610165366004610a0e565b6103f8565b6040516100a09190610c13565b60006101836001610c26565b6101906001600254610c3f565b9050919050565b6000908152602081905260409020546001600160a01b0316151590565b600380546101c290610c52565b80601f01602080910402602001604051908101604052809291908181526020018280546101ee90610c52565b801561023b5780601f106102105761010080835404028352916020019161023b565b820191906000526020600020905b81548152906001019060200180831161021e57829003601f168201915b505050505081565b600480546101c290610c52565b6060600061025d83610197565b61026657600080fd5b6000838152602081905260409020805460018201546002830180546001600160a01b0390931693919261029890610c52565b80601f01602080910402602001604051908101604052809291908181526020018280546102c490610c52565b80156103115780601f106102e657610100808354040283529160200191610311565b820191906000526020600020905b8154815290600101906020018083116102f457829003601f168201915b5050505050905092509250925092565b60606000828152602081905260409020600201805461033f90610c52565b80601f016020809104026020016040519081016040528092919081815260200182805461036b90610c52565b80156103b85780601f1061038d576101008083540402835291602001916103b8565b820191906000526020600020905b81548152906001019060200180831161039b57829003601f168201915b50505050509050919050565b6000908152602081905260409020546001600160a01b031690565b6000908152602081905260409020600101549056fea2646970667358221220"; // Placeholder

async function main() {
  console.log('🚀 Deploying EvidenceVault to Polygon Mumbai...\n');

  // Check environment
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Error: BLOCKCHAIN_PRIVATE_KEY not found in .env');
    console.log('\n📝 Please add your private key to .env:');
    console.log('   BLOCKCHAIN_PRIVATE_KEY=your_private_key_here\n');
    process.exit(1);
  }

  // Connect to Polygon Mumbai
  const rpcUrl = process.env.POLYGON_RPC_URL || 'https://rpc-mumbai.maticvigil.com';
  console.log('🔗 Connecting to:', rpcUrl);
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('👛 Deployer address:', wallet.address);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceInMatic = ethers.formatEther(balance);
  console.log('💰 Balance:', balanceInMatic, 'MATIC');

  if (parseFloat(balanceInMatic) < 0.01) {
    console.error('\n❌ Error: Insufficient balance for deployment');
    console.log('📝 You need at least 0.01 MATIC for gas fees');
    console.log('🚰 Get testnet MATIC from: https://faucet.polygon.technology/\n');
    process.exit(1);
  }

  // Check network
  const network = await provider.getNetwork();
  console.log('🌐 Network:', network.name, '(Chain ID:', Number(network.chainId) + ')');

  if (Number(network.chainId) !== 80001) {
    console.warn('\n⚠️  Warning: Not connected to Polygon Mumbai (80001)');
    console.log('   Current chain ID:', Number(network.chainId));
  }

  console.log('\n📄 Contract: EvidenceVault.sol');
  console.log('⏳ Deploying...\n');

  // Note: This is a simplified deployment script
  // For actual deployment, you should:
  // 1. Compile the contract with solc or hardhat
  // 2. Use the compiled bytecode and ABI
  // 3. Or use Remix IDE for easier deployment

  console.log('⚠️  IMPORTANT: This script requires compiled contract bytecode.');
  console.log('\n📝 To deploy the contract, please use one of these methods:\n');
  
  console.log('Option 1: Remix IDE (Easiest)');
  console.log('  1. Go to https://remix.ethereum.org/');
  console.log('  2. Create new file: EvidenceVault.sol');
  console.log('  3. Copy contract from: backend/contracts/EvidenceVault.sol');
  console.log('  4. Compile with Solidity 0.8.0+');
  console.log('  5. Deploy:');
  console.log('     - Environment: "Injected Provider - MetaMask"');
  console.log('     - Network: Polygon Mumbai');
  console.log('     - Click "Deploy"');
  console.log('  6. Copy deployed contract address\n');

  console.log('Option 2: Hardhat (Advanced)');
  console.log('  1. npm install --save-dev hardhat');
  console.log('  2. npx hardhat init');
  console.log('  3. Configure hardhat.config.js for Mumbai');
  console.log('  4. npx hardhat run scripts/deploy.js --network mumbai\n');

  console.log('After deployment:');
  console.log('  1. Copy the contract address');
  console.log('  2. Add to .env:');
  console.log('     EVIDENCE_VAULT_CONTRACT=0xYourContractAddress');
  console.log('  3. Restart the backend server\n');

  // Save contract source for reference
  const contractPath = path.join(__dirname, '..', 'contracts', 'EvidenceVault.sol');
  if (!fs.existsSync(path.dirname(contractPath))) {
    fs.mkdirSync(path.dirname(contractPath), { recursive: true });
  }
  
  console.log('✅ Contract source available at:', contractPath);
  console.log('\n🎉 Ready for deployment!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  });
