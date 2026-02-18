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
    const tx = await forwarder.execute(fixedRequest, {
    value: fixedRequest.value,
  });


    const receipt = await tx.wait();
    return res.json({ success: true, txHash: tx.hash });

  } catch (err) {
    console.error("Relay failed:", err);
    return res.status(500).json({ error: err.message });
  }
};
