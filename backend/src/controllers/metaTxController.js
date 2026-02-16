import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const relayerWallet = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

const forwarderAbi = [
  // You only really need these two
  "function nonces(address owner) view returns (uint256)",
  "function verify(((address from, address to, uint256 value, uint256 gas, uint48 deadline, bytes data, bytes signature))) view returns (bool)",
  "function execute(((address from, address to, uint256 value, uint256 gas, uint48 deadline, bytes data, bytes signature))) payable returns (bool, bytes)",
  // Optional: if you want executeBatch later
  // "function executeBatch(((address, address, uint256, uint256, uint48, bytes, bytes))[], address) payable returns (bool[], bytes[])"
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
