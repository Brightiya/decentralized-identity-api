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
    outputs: [
      { internalType: "bool", name: "", type: "bool" },
      { internalType: "bytes", name: "", type: "bytes" },
    ],
    stateMutability: "payable",
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
];

const forwarder = new ethers.Contract(FORWARDER_ADDRESS, forwarderAbi, relayerWallet);

console.log("Backend relayer ready. Forwarder address:", FORWARDER_ADDRESS);

export const relayMetaTx = async (req, res) => {
  try {
    const { request, signature } = req.body;

    if (!request || !signature) {
      return res.status(400).json({ error: "Missing request or signature" });
    }

    const fixedRequest = {
      from: request.from,
      to: request.to,
      value: BigInt(request.value ?? "0"),
      gas: BigInt(request.gas),
      deadline: BigInt(request.deadline),
      data: request.data,
      signature,
    };

    if (fixedRequest.gas > 3000000n) {
      return res.status(400).json({ error: "Requested gas limit too high (max 3M)" });
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    if (fixedRequest.deadline < now) {
      return res.status(400).json({ error: "Meta-tx deadline already expired" });
    }

    const currentNonce = await forwarder.nonces(fixedRequest.from);
    console.log(`Current on-chain nonce for ${fixedRequest.from}: ${currentNonce.toString()}`);

    console.log("=== RELAY REQUEST ===");
    console.log("From:", fixedRequest.from);
    console.log("To:", fixedRequest.to);
    console.log("Value:", fixedRequest.value.toString());
    console.log("Gas requested:", fixedRequest.gas.toString());
    console.log("Deadline:", fixedRequest.deadline.toString());
    console.log("Data prefix:", fixedRequest.data.slice(0, 30) + "...");
    console.log("Signature prefix:", signature.slice(0, 20) + "...");

    // Fetch domain on backend for debug/recovery
    const domainInfo = await forwarder.eip712Domain();
    const [fieldsRaw, name, version, chainIdRaw, verifyingContract, saltRaw, extensions] = domainInfo;
    const fields = BigInt(fieldsRaw); // bytes1 -> bigint

    const domain = {
      name,
      version,
      chainId: Number(chainIdRaw),
      verifyingContract,
    };

    if (fields & 0x20n) {
      // saltRaw is bigint → convert to hex string (ethers requires string for salt)
      const saltHex = "0x" + saltRaw.toString(16).padStart(64, "0");
      domain.salt = saltHex;
      console.log("Added salt to domain:", saltHex);
    }

    if (extensions.length > 0) {
      console.warn("Extensions present:", extensions);
    }

    console.log("Backend domain:", domain);

    // Debug: manual off-chain recovery (should match frontend recovered address)
    const types = {
      ForwardRequestData: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
       // { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint48" },
        { name: "data", type: "bytes" },
      ],
    };

    // For recovery: use strings for numeric fields to avoid any BigInt coercion issues
    const recoveryMessage = {
      from: fixedRequest.from,
      to: fixedRequest.to,
      value: fixedRequest.value.toString(),       // string
      gas: fixedRequest.gas.toString(),           // string
    //  nonce: currentNonce.toString(),             // string
      deadline: fixedRequest.deadline.toString(), // string
      data: fixedRequest.data,
    };

    const recovered = ethers.verifyTypedData(domain, types, recoveryMessage, signature);

    console.log("Manual off-chain recovered signer:", recovered);
    console.log("Does it match 'from'?", recovered.toLowerCase() === fixedRequest.from.toLowerCase());

    const isValid = await forwarder.verify(fixedRequest);
    console.log("verify() result:", isValid);

    if (!isValid) {
      return res.status(400).json({ 
        error: "Invalid signature or request (verify failed)",
        debug: { 
          recovered, 
          expected: fixedRequest.from, 
          nonceUsed: currentNonce.toString(),
          domainUsed: domain 
        }
      });
    }

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