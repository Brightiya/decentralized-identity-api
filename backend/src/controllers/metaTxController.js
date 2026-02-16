import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
);

const relayerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const forwarderAbi = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
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
          { internalType: "bytes", name: "signature", type: "bytes" }
        ],
        internalType: "struct ERC2771Forwarder.ForwardRequestData",
        name: "request",
        type: "tuple"
      }
    ],
    name: "verify",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
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
          { internalType: "bytes", name: "signature", type: "bytes" }
        ],
        internalType: "struct ERC2771Forwarder.ForwardRequestData",
        name: "request",
        type: "tuple"
      }
    ],
    name: "execute",
    outputs: [
      { internalType: "bool", name: "", type: "bool" },
      { internalType: "bytes", name: "", type: "bytes" }
    ],
    stateMutability: "payable",
    type: "function"
  },
  // Optional - may revert if missing in your deployment
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  }
];

const forwarder = new ethers.Contract(
  process.env.FORWARDER_ADDRESS,
  forwarderAbi,
  relayerWallet
);

// Startup log
console.log("Backend relayer ready. Forwarder address:", process.env.FORWARDER_ADDRESS);

export const relayMetaTx = async (req, res) => {
  try {
    const { request, signature } = req.body;

    if (!request || !signature) {
      return res.status(400).json({ error: "Missing request or signature" });
    }

    const fixedRequest = {
      from: request.from,
      to: request.to,
      value: BigInt(request.value ?? 0),
      gas: BigInt(request.gas),
      deadline: BigInt(request.deadline),
      data: request.data,
      signature
    };

    if (fixedRequest.gas > 1500000n) {
      return res.status(400).json({ error: "Gas limit too high" });
    }

    console.log("=== RELAY REQUEST ===");
    console.log("From:", fixedRequest.from);
    console.log("To:", fixedRequest.to);
    console.log("Deadline:", fixedRequest.deadline.toString());
    console.log("Signature:", signature.slice(0, 20) + "...");

    const isValid = await forwarder.verify(fixedRequest);
    console.log("verify result:", isValid);

    if (!isValid) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    console.log("Executing...");
    const tx = await forwarder.execute(fixedRequest, {
      value: fixedRequest.value,
      gasLimit: 2000000 // higher safety margin
    });

    console.log("Tx sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Mined in block:", receipt.blockNumber);

    return res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    });

  } catch (err) {
    console.error("Relay failed:", err);

    let errorMsg = err.reason || err.message || "Unknown relay error";

    // Improve error messages
    if (errorMsg.includes("DOMAIN_SEPARATOR")) {
      errorMsg = "Contract does not expose DOMAIN_SEPARATOR - likely older OZ version";
    } else if (errorMsg.includes("InvalidAccountNonce")) {
      errorMsg = "Nonce mismatch - user already used this nonce";
    } else if (errorMsg.includes("ERC2771ForwarderExpiredRequest")) {
      errorMsg = "Meta-tx deadline expired";
    } else if (errorMsg.includes("ERC2771ForwarderInvalidSigner")) {
      errorMsg = "Recovered signer does not match from address";
    }

    return res.status(500).json({ error: errorMsg });
  }
};