// metaTxController.js
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
);

const relayerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS;


// Simple queue to ensure transactions are sent one after another
class TxQueue {
  constructor() {
    this.queue = Promise.resolve();
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue = this.queue.then(() => 
        task().then(resolve).catch(reject)
      );
    });
  }
}

const txQueue = new TxQueue();


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
    const { request, signature } = req.body;

    if (!request || !signature) {
      return res.status(400).json({ error: "Missing request or signature" });
    }

    // 1. Fetch data required for verification
    const currentNonce = await forwarder.nonces(request.from);
    const domainInfo = await forwarder.eip712Domain();

    // 2. Format the request to match the ABI struct (ForwardRequestData)
    const fixedRequest = {
      from: request.from,
      to: request.to,
      value: BigInt(request.value || "0"),
      gas: BigInt(request.gas),
      deadline: BigInt(request.deadline),
      data: request.data,
      signature: signature,
    };

    // 3. Build Domain for recovery
    const domain = {
      name: domainInfo[1],
      version: domainInfo[2],
      chainId: Number(domainInfo[3]),
      verifyingContract: domainInfo[4],
    };

    // 4. Types for manual recovery (Must be "ForwardRequest" with nonce)
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

    const recoveryMessage = {
      from: fixedRequest.from,
      to: fixedRequest.to,
      value: fixedRequest.value,
      gas: fixedRequest.gas,
      nonce: currentNonce,
      deadline: fixedRequest.deadline,
      data: fixedRequest.data,
    };

    // 5. Off-chain & On-chain Verification
    const recovered = ethers.verifyTypedData(domain, typesForRecovery, recoveryMessage, signature);
    
    if (recovered.toLowerCase() !== request.from.toLowerCase()) {
      return res.status(400).json({ error: "Invalid signature (Recovery failed)" });
    }

    const isValid = await forwarder.verify(fixedRequest);
    if (!isValid) {
      return res.status(400).json({ error: "On-chain verify() failed" });
    }

    // 6. Enqueued Execution (Serializes transactions to prevent nonce collisions)
    const result = await txQueue.enqueue(async () => {
      console.log(`Processing meta-tx for ${request.from} in queue...`);

      // Fetch current fee data from provider for the latest gas prices
      const feeData = await provider.getFeeData();

      // Execute with a gas tip (20% buffer) to prevent REPLACEMENT_UNDERPRICED
      const tx = await forwarder.execute(fixedRequest, {
        value: fixedRequest.value,
        // Buffering maxFee and PriorityFee for fast inclusion
        maxFeePerGas: (feeData.maxFeePerGas * 120n) / 100n,
        maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas * 120n) / 100n,
      });

      console.log("Transaction submitted:", tx.hash);
      
      const receipt = await tx.wait(); // Ensures this transaction is mined before the next one starts
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    });

    // 7. Success Response
    return res.json({
      success: true,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed
    });

  } catch (err) {
    console.error("Relay failed:", err);
    
    // Check for specific ethers error codes to provide better feedback
    if (err.code === 'REPLACEMENT_UNDERPRICED') {
      return res.status(500).json({ error: "Relayer is busy or gas price spiked. Please try again." });
    }

    return res.status(500).json({ error: err.message || "Internal relay error" });
  }
};

