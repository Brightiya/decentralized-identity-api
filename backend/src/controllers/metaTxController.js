// Import ethers.js for Ethereum RPC interaction, signing, and verification
import { ethers } from "ethers";

// Create JSON-RPC provider connected to Base Sepolia testnet
// Uses environment variable if provided, otherwise defaults to public RPC
const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
);

// Wallet used by the backend relayer to submit transactions

const relayerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Address of the deployed ERC2771 Forwarder contract
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS;


/*
  Simple transaction queue implementation.

  Purpose:
  Prevent multiple relayed transactions from being submitted simultaneously,
  which can cause nonce collisions on the relayer wallet.

  The queue ensures:
  - Each transaction waits until the previous one is mined
  - Relayer wallet nonce stays consistent
*/
class TxQueue {

  constructor() {
    // Start queue with a resolved promise
    this.queue = Promise.resolve();
  }

  enqueue(task) {
    // Wrap tasks so they execute sequentially
    return new Promise((resolve, reject) => {

      this.queue = this.queue.then(() =>
        task().then(resolve).catch(reject)
      );

    });
  }
}

// Global instance of the transaction queue
const txQueue = new TxQueue();


/*
  Minimal ABI required to interact with the ERC2771 Forwarder contract.

  Includes:
  - nonces(): retrieves nonce for replay protection
  - eip712Domain(): retrieves domain used for EIP-712 signature verification
  - verify(): checks validity of a forward request
  - execute(): executes the forwarded meta-transaction
*/
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


/*
  Instantiate the forwarder contract using the relayer wallet.

  The relayer wallet will:
  - verify signatures
  - submit meta-transactions
*/
const forwarder = new ethers.Contract(
  FORWARDER_ADDRESS,
  forwarderAbi,
  relayerWallet
);


/*
  Relay endpoint for meta-transactions.

  Responsibilities:
  1. Validate request payload
  2. Reconstruct EIP-712 domain
  3. Recover signer from typed signature
  4. Verify request on-chain
  5. Enqueue execution through relayer wallet
*/
export const relayMetaTx = async (req, res) => {
  try {

    const { request, signature } = req.body;

    // Basic request validation
    if (!request || !signature) {
      return res.status(400).json({ error: "Missing request or signature" });
    }

    /*
      Step 1: Fetch required verification data
      - Current nonce for replay protection
      - Domain parameters used for EIP-712 signing
    */
    const currentNonce = BigInt(await forwarder.nonces(request.from));

    const domainInfo = await forwarder.eip712Domain();


    /*
      Step 2: Normalize request fields to match contract struct
      Ensures numeric values are properly converted to BigInt
    */
    const fixedRequest = {
      from: request.from,
      to: request.to,
      value: BigInt(request.value || "0"),
      gas: BigInt(request.gas),
      deadline: BigInt(request.deadline),
      data: request.data,
      signature: signature,
    };


    /*
      Step 3: Reconstruct EIP-712 domain used for signature recovery
      Must match exactly the domain used by the frontend wallet
    */
    const domain = {
      name: domainInfo.name,
      version: domainInfo.version,
      chainId: Number(domainInfo.chainId), // must be a number
      verifyingContract: domainInfo.verifyingContract,
    };

    console.log("Reconstructed Backend Domain:", domain);


    /*
      Step 4: Define typed data structure used during signature creation.

      IMPORTANT:
      Must match the struct used during wallet signing.
    */
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


    /*
      Step 5: Construct message used for signature recovery.
      Includes nonce to protect against replay attacks.
    */
    const recoveryMessage = {
      from: fixedRequest.from,
      to: fixedRequest.to,
      value: fixedRequest.value,
      gas: fixedRequest.gas,
      nonce: currentNonce,
      deadline: fixedRequest.deadline,
      data: fixedRequest.data,
    };


    /*
      Perform off-chain signature recovery using EIP-712 verification.
      Ensures the request was signed by the expected user.
    */
    const recovered = ethers.verifyTypedData(
      domain,
      typesForRecovery,
      recoveryMessage,
      signature
    );

    if (recovered.toLowerCase() !== request.from.toLowerCase()) {
      return res.status(400).json({
        error: "Invalid signature (Recovery failed)"
      });
    }


    /*
      Step 6: Perform on-chain verification using the forwarder contract.
      This ensures:
      - signature is valid
      - nonce matches
      - request structure is correct
    */
    const isValid = await forwarder.verify(fixedRequest);

    if (!isValid) {
      return res.status(400).json({ error: "On-chain verify() failed" });
    }


    /*
      Step 7: Enqueue transaction execution.

      Transactions are serialized using TxQueue to prevent:
      - nonce collisions
      - relayer wallet race conditions
    */
    const result = await txQueue.enqueue(async () => {

      console.log(`Processing meta-tx for ${request.from} in queue...`);

      /*
        Fetch current fee data from provider.
        Used to dynamically set gas fees.
      */
      const feeData = await provider.getFeeData();

      /*
        Execute forward request with a 20% gas buffer.

        This prevents REPLACEMENT_UNDERPRICED errors
        if network gas prices increase slightly.
      */
      const tx = await forwarder.execute(fixedRequest, {

        value: fixedRequest.value,

        maxFeePerGas: (feeData.maxFeePerGas * 120n) / 100n,

        maxPriorityFeePerGas:
          (feeData.maxPriorityFeePerGas * 120n) / 100n,
      });

      console.log("Transaction submitted:", tx.hash);

      /*
        Wait until the transaction is mined before processing
        the next transaction in the queue.
      */
      const receipt = await tx.wait();

      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    });


    /*
      Step 8: Return success response
    */
    return res.json({
      success: true,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed
    });

  } catch (err) {

    console.error("Relay failed:", err);

    /*
      Handle specific ethers error codes for better feedback.
    */
    if (err.code === 'REPLACEMENT_UNDERPRICED') {

      return res.status(500).json({
        error: "Relayer is busy or gas price spiked. Please try again."
      });
    }

    return res.status(500).json({
      error: err.message || "Internal relay error"
    });
  }
};