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
          { internalType: "uint256", name: "nonce", type: "uint256" }, // This is uint256
          { internalType: "uint48", name: "deadline", type: "uint48" }, // This is uint48
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
          { internalType: "uint256", name: "nonce", type: "uint256" },
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
    outputs: [
      { internalType: "bool", name: "", type: "bool" },
      { internalType: "bytes", name: "", type: "bytes" },
    ],
    stateMutability: "payable",
    type: "function",
  },
];

const forwarder = new ethers.Contract(FORWARDER_ADDRESS, forwarderAbi, relayerWallet);

console.log("Backend relayer ready. Forwarder address:", FORWARDER_ADDRESS);

export const relayMetaTx = async (req, res) => {
  try {
    const { request, signature } = req.body;

    if (!request || !signature) {
      return res.status(400).json({ error: "Missing request or signature" });
    }

    // IMPORTANT: Create the request object in the EXACT order expected by the contract
    const fixedRequest = {
      from: request.from,
      to: request.to,
      value: BigInt(request.value || "0"),
      gas: BigInt(request.gas),
      nonce: BigInt(request.nonce),  // This must be included
      deadline: BigInt(request.deadline),
      data: request.data,
      signature: signature,
    };

    console.log("=== RELAY REQUEST ===");
    console.log("From:", fixedRequest.from);
    console.log("To:", fixedRequest.to);
    console.log("Value:", fixedRequest.value.toString());
    console.log("Gas requested:", fixedRequest.gas.toString());
    console.log("Nonce:", fixedRequest.nonce.toString());
    console.log("Deadline:", fixedRequest.deadline.toString());
    console.log("Data prefix:", fixedRequest.data.slice(0, 50) + "...");
    console.log("Signature prefix:", signature.slice(0, 30) + "...");

    // Verify nonce matches on-chain value
    const currentNonce = await forwarder.nonces(fixedRequest.from);
    console.log(`Current on-chain nonce for ${fixedRequest.from}: ${currentNonce.toString()}`);
    
    if (fixedRequest.nonce !== currentNonce) {
      return res.status(400).json({ 
        error: "Nonce mismatch",
        debug: { expected: currentNonce.toString(), got: fixedRequest.nonce.toString() }
      });
    }

    // Check deadline
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (fixedRequest.deadline < now) {
      return res.status(400).json({ error: "Meta-tx deadline already expired" });
    }

    // Fetch domain for debugging
    const domainInfo = await forwarder.eip712Domain();
    const [fieldsRaw, name, version, chainIdRaw, verifyingContract, saltRaw, extensions] = domainInfo;
    const fields = BigInt(fieldsRaw);

    const domain = {
      name,
      version,
      chainId: Number(chainIdRaw),
      verifyingContract,
    };

    if (fields & 0x20n) {
      const saltHex = "0x" + saltRaw.toString(16).padStart(64, "0");
      domain.salt = saltHex;
    }

    console.log("Backend domain:", domain);

    // Manual off-chain recovery
    const types = {
      ForwardRequestData: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint48" },
        { name: "data", type: "bytes" },
      ],
    };

    const recovered = ethers.verifyTypedData(domain, types, fixedRequest, signature);

    console.log("Manual off-chain recovered signer:", recovered);
    console.log("Does it match 'from'?", recovered.toLowerCase() === fixedRequest.from.toLowerCase());

    // In metaTxController.js, before calling verify()
console.log("=== DOMAIN DEBUG ===");
console.log("Domain object:", domain);

// Calculate the domain separator hash
const domainTypes = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ]
};

// If salt is present, add it
if (domain.salt) {
  domainTypes.EIP712Domain.push({ name: 'salt', type: 'bytes32' });
}

const domainSeparator = ethers.TypedDataEncoder.hashDomain(domain);
console.log("Domain separator hash:", domainSeparator);

// Get the contract's domain separator
try {
  // Some contracts have a DOMAIN_SEPARATOR() function
  const contractDomainSeparator = await forwarder.eip712Domain();
  console.log("Contract domain info:", contractDomainSeparator);
} catch (e) {
  console.log("Could not get contract domain separator directly");
}

    // Call verify on the contract
    console.log("Calling verify() on contract...");
    const isValid = await forwarder.verify(fixedRequest);
    console.log("verify() result:", isValid);

    if (!isValid) {
      return res.status(400).json({ 
        error: "Invalid signature or request (verify failed)",
        debug: { 
          recovered, 
          expected: fixedRequest.from, 
          nonce: fixedRequest.nonce.toString(),
          currentNonce: currentNonce.toString(),
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
    
    // More detailed error logging
    if (err.transaction) {
      console.error("Transaction that failed:", {
        to: err.transaction.to,
        data: err.transaction.data?.slice(0, 100) + "...",
      });
    }

    let errorMsg = err.reason || err.message || "Unknown relay error";

    if (errorMsg.includes("ERC2771ForwarderExpiredRequest")) {
      errorMsg = "Meta-tx deadline has expired";
    } else if (errorMsg.includes("ERC2771ForwarderInvalidSigner")) {
      errorMsg = "Recovered signer does not match 'from' address";
    } else if (errorMsg.includes("InvalidAccountNonce")) {
      errorMsg = "Nonce mismatch – likely replay attempt or stale request";
    } else if (errorMsg.includes("ERC2771ForwarderMismatchedValue")) {
      errorMsg = "Value mismatch in forwarded call";
    } else if (errorMsg.includes("out of gas")) {
      errorMsg = "Transaction ran out of gas – try increasing gas limit";
    }

    return res.status(500).json({ error: errorMsg });
  }
};