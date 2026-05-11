// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title EvidenceVault
 * @dev Store evidence hashes on-chain for tamper-proof verification
 * Optimized for Polygon network (low gas fees)
 */
contract EvidenceVault {
    
    struct Evidence {
        bytes32 fileHash;        // SHA-256 hash of the evidence file
        address uploader;        // Address of the user who uploaded
        uint256 timestamp;       // Block timestamp
        string evidenceType;     // "audio", "video", "location", etc.
        string metadata;         // JSON metadata (reason, location, etc.)
        bool exists;             // Flag to check if evidence exists
    }
    
    // Mapping from evidence ID to Evidence struct
    mapping(string => Evidence) public evidences;
    
    // Array to track all evidence IDs
    string[] public evidenceIds;
    
    // Events
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
    
    /**
     * @dev Store evidence hash on blockchain
     * @param evidenceId Unique identifier for the evidence (from Firebase)
     * @param fileHash SHA-256 hash of the file
     * @param evidenceType Type of evidence (audio, video, etc.)
     * @param metadata JSON string with additional data
     */
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
    
    /**
     * @dev Verify evidence exists and matches hash
     * @param evidenceId Evidence identifier
     * @param fileHash Hash to verify against
     * @return bool True if evidence exists and hash matches
     */
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
    
    /**
     * @dev Get evidence details
     * @param evidenceId Evidence identifier
     * @return fileHash, uploader, timestamp, evidenceType, metadata
     */
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
    
    /**
     * @dev Get total number of evidences stored
     */
    function getEvidenceCount() public view returns (uint256) {
        return evidenceIds.length;
    }
    
    /**
     * @dev Get evidence ID by index
     */
    function getEvidenceIdByIndex(uint256 index) public view returns (string memory) {
        require(index < evidenceIds.length, "Index out of bounds");
        return evidenceIds[index];
    }
    
    /**
     * @dev Check if evidence exists
     */
    function evidenceExists(string memory evidenceId) public view returns (bool) {
        return evidences[evidenceId].exists;
    }
}
