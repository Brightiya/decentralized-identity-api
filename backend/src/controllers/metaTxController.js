import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org");

const relayerWallet = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

const forwarderAbi = [
  // Minimal ABI for ERC2771Forwarder v5
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "nonces",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "from", "type": "address" },
          { "internalType": "address", "name": "to", "type": "address" },
          { "internalType": "uint256", "name": "value", "type": "uint256" },
          { "internalType": "uint256", "name": "gas", "type": "uint256" },
          { "internalType": "uint48", "name": "deadline", "type": "uint48" },
          { "internalType": "bytes", "name": "data", "type": "bytes" },
          { "internalType": "bytes", "name": "signature", "type": "bytes" }
        ],
        "internalType": "struct ERC2771Forwarder.ForwardRequestData",
        "name": "request",
        "type": "tuple"
      }
    ],
    "name": "verify",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "from", "type": "address" },
          { "internalType": "address", "name": "to", "type": "address" },
          { "internalType": "uint256", "name": "value", "type": "uint256" },
          { "internalType": "uint256", "name": "gas", "type": "uint256" },
          { "internalType": "uint48", "name": "deadline", "type": "uint48" },
          { "internalType": "bytes", "name": "data", "type": "bytes" },
          { "internalType": "bytes", "name": "signature", "type": "bytes" }
        ],
        "internalType": "struct ERC2771Forwarder.ForwardRequestData",
        "name": "request",
        "type": "tuple"
      }
    ],
    "name": "execute",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" },
      { "internalType": "bytes", "name": "", "type": "bytes" }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const forwarder = new ethers.Contract(
  process.env.FORWARDER_ADDRESS,
  forwarderAbi,
  relayerWallet
);

// Startup safety check
(async () => {
  try {
    const network = await provider.getNetwork();
    console.log(`Backend connected to chain ${network.chainId}`);
    if (network.chainId !== 84532n) {
      throw new Error(`Wrong chain! Expected 84532 (Base Sepolia), got ${network.chainId}`);
    }
    const fwdAddr = await forwarder.getAddress();
    console.log(`Forwarder contract address: ${fwdAddr}`);
  } catch (err) {
    console.error("Backend startup check failed:", err.message);
  }
})();

export const relayMetaTx = async (req, res) => {
  try {
    const { request, signature } = req.body;

    if (!request || !signature) {
      return res.status(400).json({ error: "request and signature are required" });
    }

    const fixedRequest = {
      from: request.from,
      to: request.to,
      value: BigInt(request.value ?? 0),
      gas: BigInt(request.gas),
      deadline: BigInt(request.deadline),
      data: request.data,
      signature: signature
    };

    // Gas protection
    if (fixedRequest.gas > 1500000n) {
      return res.status(400).json({ error: "Gas limit too high" });
    }

    console.log("=== RELAY REQUEST ===");
    console.log("Forwarder address:", process.env.FORWARDER_ADDRESS);
    console.log("Request:", {
      from: fixedRequest.from,
      to: fixedRequest.to,
      value: fixedRequest.value.toString(),
      gas: fixedRequest.gas.toString(),
      deadline: fixedRequest.deadline.toString(),
      data: fixedRequest.data.slice(0, 20) + "...",
      signature: fixedRequest.signature.slice(0, 20) + "..."
    });

    // Manual recovery debug
    try {
      const domainSeparator = await forwarder.DOMAIN_SEPARATOR();
      console.log("Domain separator:", domainSeparator);

      const typeHash = ethers.id("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint48 deadline,bytes data)");
      const structHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "address", "uint256", "uint256", "uint48", "bytes"],
          [typeHash, fixedRequest.from, fixedRequest.to, fixedRequest.value, fixedRequest.gas, fixedRequest.deadline, fixedRequest.data]
        )
      );

      const digest = ethers.keccak256(
        ethers.solidityPacked(["string", "bytes32", "bytes32"], ["\x19\x01", domainSeparator, structHash])
      );

      console.log("Computed digest:", digest);

      const recovered = ethers.recoverAddress(digest, fixedRequest.signature);
      console.log("Recovered signer:", recovered.toLowerCase());
      console.log("Expected from:", fixedRequest.from.toLowerCase());
      console.log("Match?", recovered.toLowerCase() === fixedRequest.from.toLowerCase());
    } catch (debugErr) {
      console.error("Manual recovery debug failed:", debugErr.message);
    }

    // Actual verify
    const isValid = await forwarder.verify(fixedRequest);
    console.log("Contract verify result:", isValid);

    if (!isValid) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Execute
    console.log("Executing meta-tx...");
    const tx = await forwarder.execute(fixedRequest, { value: fixedRequest.value });
    console.log("Execute tx hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Receipt block:", receipt.blockNumber);

    return res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    });

  } catch (err) {
    console.error("Relay error:", err);
    const errorMessage = err.reason || err.message || "Unknown error during relay";
    return res.status(500).json({ error: errorMessage });
  }
};