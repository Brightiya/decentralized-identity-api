import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);

const relayerWallet = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

const forwarderAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "nonces",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "gas",
            "type": "uint256"
          },
          {
            "internalType": "uint48",
            "name": "deadline",
            "type": "uint48"
          },
          {
            "internalType": "bytes",
            "name": "data",
            "type": "bytes"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          }
        ],
        "internalType": "struct ERC2771Forwarder.ForwardRequestData",
        "name": "request",
        "type": "tuple"
      }
    ],
    "name": "verify",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [ /* copy the exact same components array from above here */ ],
        "internalType": "struct ERC2771Forwarder.ForwardRequestData",
        "name": "request",
        "type": "tuple"
      }
    ],
    "name": "execute",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
];



const forwarder = new ethers.Contract(
  process.env.FORWARDER_ADDRESS,
  forwarderAbi,
  relayerWallet
);

export const relayMetaTx = async (req, res) => {
  try {
    const { request, signature } = req.body;

    if (!request || !signature) {
      return res.status(400).json({ error: "request and signature are required" });
    }

    // Convert numeric fields properly
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

    console.log("=== Verify Debug ===");
    console.log("Full request object:", {
    from: fixedRequest.from,
    to: fixedRequest.to,
    value: fixedRequest.value.toString(),
    gas: fixedRequest.gas.toString(),
    deadline: fixedRequest.deadline.toString(),
    data: fixedRequest.data.slice(0, 10) + "...",
    signature: fixedRequest.signature
}); 

console.log("Backend using FORWARDER_ADDRESS:", process.env.FORWARDER_ADDRESS);
console.log("Calling verify on:", process.env.FORWARDER_ADDRESS);

    // Verify signature
    const isValid = await forwarder.verify(fixedRequest);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Execute
    const tx = await forwarder.execute(fixedRequest, {value: fixedRequest.value});
    const receipt = await tx.wait();

    return res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    });

  } catch (err) {
    console.error("Relay error:", err);
    return res.status(500).json({
      error: err.reason || err.message,
    });
  }
};
