import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const relayerWallet = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

const forwarderAbi = [
  "function verify((address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data),bytes signature) view returns (bool)",
  "function execute((address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data),bytes signature) payable returns (bool,bytes)"
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

    // Basic gas protection
    if (BigInt(request.gas) > 1500000n) {
      return res.status(400).json({ error: "Gas limit too high" });
    }

    // Verify signature
    const isValid = await forwarder.verify(request, signature);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Execute
    const tx = await forwarder.execute(request, signature);
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

