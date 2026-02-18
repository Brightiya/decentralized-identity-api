// metaTxController.js
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
);

const relayerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS;

const forwarderAbi = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      { internalType: "bytes1", name: "fields", type: "bytes1" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "version", type: "string" },
      { internalType: "uint256", name: "chainId", type: "uint256" },
      { internalType: "address", name: "verifyingContract", type: "address" },
      { internalType: "bytes32", name: "salt", type: "bytes32" },
      { internalType: "uint256[]", name: "extensions", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "uint256", name: "gas", type: "uint256" },
          { internalType: "uint48", name: "deadline", type: "uint48" },
          { internalType: "bytes", name: "data", type: "bytes" },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct ERC2771Forwarder.ForwardRequestData",
        name: "request",
        type: "tuple",
      },
    ],
    name: "verify",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "uint256", name: "gas", type: "uint256" },
          { internalType: "uint48", name: "deadline", type: "uint48" },
          { internalType: "bytes", name: "data", type: "bytes" },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct ERC2771Forwarder.ForwardRequestData",
        name: "request",
        type: "tuple",
      },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

const forwarder = new ethers.Contract(FORWARDER_ADDRESS, forwarderAbi, relayerWallet);

export const relayMetaTx = async (req, res) => {
  try {
    const { request, signature } = req.body; // Expecting the full object from frontend including signature

    if (!request || !signature) {
      return res.status(400).json({ error: "Missing request or signature" });
    }

    // 1. Get current nonce from contract
    const currentNonce = await forwarder.nonces(request.from);

    // 2. Format the request to match the ABI struct exactly (7 fields)
    const fixedRequest = {
      from: request.from,
      to: request.to,
      value: BigInt(request.value || "0"),
      gas: BigInt(request.gas),
      deadline: BigInt(request.deadline),
      data: request.data,
      signature: request.signature,
    };

    // 3. Build Domain
    const domainInfo = await forwarder.eip712Domain();
    const domain = {
      name: domainInfo[1],
      version: domainInfo[2],
      chainId: Number(domainInfo[3]),
      verifyingContract: domainInfo[4],
    };

    // 4. Types for manual recovery
    // MUST be "ForwardRequest" and MUST include "nonce" to match OZ implementation
    const typesForRecovery = {
      ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint48" },
        { name: "data", type: "bytes" },
      ],
    };

    // 5. Message for manual recovery (includes nonce)
    const recoveryMessage = {
      from: fixedRequest.from,
      to: fixedRequest.to,
      value: fixedRequest.value,
      gas: fixedRequest.gas,
      nonce: currentNonce,
      deadline: fixedRequest.deadline,
      data: fixedRequest.data,
    };

    // Manual off-chain recovery check
    const recovered = ethers.verifyTypedData(domain, typesForRecovery, recoveryMessage, fixedRequest.signature);
    
    if (recovered.toLowerCase() !== request.from.toLowerCase()) {
      return res.status(400).json({ error: "Invalid signature (Recovery failed)" });
    }

    // 6. Call verify() on the contract
    // This will now return TRUE because the signature was created with the correct TypeName and Nonce
    const isValid = await forwarder.verify(fixedRequest);
    
    if (!isValid) {
      return res.status(400).json({ error: "On-chain verify() failed" });
    }

    // 7. Execute
    const nonce = await relayerWallet.getNonce("pending");
    // Get fresh fee data
    const feeData = await provider.getFeeData();
    const tx = await forwarder.execute(fixedRequest, {
    value: fixedRequest.value,
    gasLimit,
    nonce,
    maxFeePerGas: feeData.maxFeePerGas * 2n,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas * 2n,
  });


    const receipt = await tx.wait();
    return res.json({ success: true, txHash: tx.hash });

  } catch (err) {
    console.error("Relay failed:", err);
    return res.status(500).json({ error: err.message });
  }
};

/** 
// metaTxController.js
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
);

const relayerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS;
if (!FORWARDER_ADDRESS) {
  throw new Error("FORWARDER_ADDRESS not set in environment");
}

// ⚠️ IMPORTANT: Use the EXACT ABI from your Forwarder.json - 7 fields, no nonce!
const forwarderAbi = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      { internalType: "bytes1", name: "fields", type: "bytes1" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "version", type: "string" },
      { internalType: "uint256", name: "chainId", type: "uint256" },
      { internalType: "address", name: "verifyingContract", type: "address" },
      { internalType: "bytes32", name: "salt", type: "bytes32" },
      { internalType: "uint256[]", name: "extensions", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "uint256", name: "gas", type: "uint256" },
          { internalType: "uint48", name: "deadline", type: "uint48" },
          { internalType: "bytes", name: "data", type: "bytes" },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct ERC2771Forwarder.ForwardRequestData",
        name: "request",
        type: "tuple",
      },
    ],
    name: "verify",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "uint256", name: "gas", type: "uint256" },
          { internalType: "uint48", name: "deadline", type: "uint48" },
          { internalType: "bytes", name: "data", type: "bytes" },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct ERC2771Forwarder.ForwardRequestData",
        name: "request",
        type: "tuple",
      },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

const forwarder = new ethers.Contract(FORWARDER_ADDRESS, forwarderAbi, relayerWallet);

console.log("Backend relayer ready. Forwarder address:", FORWARDER_ADDRESS);

// metaTxController.js - Final working version

export const relayMetaTx = async (req, res) => {
  try {
    const { request, signature } = req.body;

    if (!request || !signature) {
      return res.status(400).json({ error: "Missing request or signature" });
    }

    // Get the current nonce from the contract (for debugging only)
    const currentNonce = await forwarder.nonces(request.from);
    console.log(`Current on-chain nonce for ${request.from}: ${currentNonce.toString()}`);

    // Create request WITHOUT nonce field
    const fixedRequest = {
      from: request.from,
      to: request.to,
      value: BigInt(request.value || "0"),
      gas: BigInt(request.gas),
      deadline: BigInt(request.deadline),
      data: request.data,
      signature: signature,
    };

    console.log("=== RELAY REQUEST ===");
    console.log("From:", fixedRequest.from);
    console.log("To:", fixedRequest.to);
    console.log("Value:", fixedRequest.value.toString());
    console.log("Gas requested:", fixedRequest.gas.toString());
    console.log("Deadline:", fixedRequest.deadline.toString());
    console.log("Data prefix:", fixedRequest.data.slice(0, 50) + "...");
    console.log("Signature prefix:", signature.slice(0, 30) + "...");

    // Check deadline
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (fixedRequest.deadline < now) {
      return res.status(400).json({ error: "Meta-tx deadline already expired" });
    }

    // Fetch domain from contract
    const domainInfo = await forwarder.eip712Domain();
    const [fieldsRaw, name, version, chainIdRaw, verifyingContract, saltRaw, extensions] = domainInfo;
    const fields = BigInt(fieldsRaw);

    // ⚠️ IMPORTANT: Build domain with ONLY the fields that are actually used
    // fields = '0x0f' means only name, version, chainId, verifyingContract are used
    const domain = {
      name,
      version,
      chainId: Number(chainIdRaw),
      verifyingContract,
    };

    console.log("Fields byte:", fieldsRaw);
    console.log("Backend domain:", domain);

    // Types for off-chain recovery - match the signed data
    const typesForRecovery = {
      ForwardRequestData: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "deadline", type: "uint48" },
        { name: "data", type: "bytes" },
      ],
    };

    // Recovery object without signature
    const recoveryRequest = {
      from: request.from,
      to: request.to,
      value: BigInt(request.value || "0"),
      gas: BigInt(request.gas),
      deadline: BigInt(request.deadline),
      data: request.data,
    };

    // Manual off-chain recovery
    const recovered = ethers.verifyTypedData(domain, typesForRecovery, recoveryRequest, signature);
    console.log("Manual off-chain recovered signer:", recovered);
    console.log("Does it match 'from'?", recovered.toLowerCase() === request.from.toLowerCase());

    if (recovered.toLowerCase() !== request.from.toLowerCase()) {
      return res.status(400).json({ 
        error: "Recovered signer does not match from address",
        debug: { recovered, expected: request.from }
      });
    }

    // Call verify on the contract
    console.log("Calling verify() on contract...");
    console.log("Verify request struct:", {
      from: fixedRequest.from,
      to: fixedRequest.to,
      value: fixedRequest.value.toString(),
      gas: fixedRequest.gas.toString(),
      deadline: fixedRequest.deadline.toString(),
      dataLength: fixedRequest.data.length,
      signatureLength: fixedRequest.signature.length,
    });
    
    const isValid = await forwarder.verify(fixedRequest);
    console.log("verify() result:", isValid);

    if (!isValid) {
      return res.status(400).json({ 
        error: "Invalid signature or request (verify failed)",
        debug: { 
          recovered, 
          expected: request.from, 
          domainUsed: domain 
        }
      });
    }

    // Execute the transaction
    console.log("Executing meta-tx...");
    const gasLimit = (fixedRequest.gas * 130n) / 100n + 100000n;

    const tx = await forwarder.execute(fixedRequest, {
      value: fixedRequest.value,
      gasLimit,
    });

    console.log("Tx sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Mined in block:", receipt.blockNumber);

    return res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Relay failed:", err);
    
    if (err.transaction) {
      console.error("Transaction that failed:", {
        to: err.transaction.to,
        data: err.transaction.data?.slice(0, 100) + "...",
      });
    }

    let errorMsg = err.reason || err.message || "Unknown relay error";
    return res.status(500).json({ error: errorMsg });
  }
};
*/