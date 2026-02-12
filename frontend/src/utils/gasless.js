import { ethers } from "ethers";
import contractDataGSN from "../contractDataGSN.json";

export async function sendGaslessSetClaim({
  signer,
  owner,
  claimId,
  claimHash,
  registry,
}) {
  const forwarderAddress = contractDataGSN.forwarderAddress;

  const forwarder = new ethers.Contract(
    forwarderAddress,
    [
      "function getNonce(address) view returns (uint256)"
    ],
    signer
  );

  const from = await signer.getAddress();
  const nonce = await forwarder.getNonce(from);

  const data = registry.interface.encodeFunctionData(
    "setClaim",
    [owner, claimId, claimHash]
  );

  const request = {
    from,
    to: registry.target,
    value: 0,
    gas: 500000,
    nonce: nonce.toString(),
    data,
  };

  // Must match Forwarder TYPEHASH
  const TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes(
      "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
    )
  );

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    [
      "bytes32",
      "address",
      "address",
      "uint256",
      "uint256",
      "uint256",
      "bytes32",
    ],
    [
      TYPEHASH,
      request.from,
      request.to,
      request.value,
      request.gas,
      request.nonce,
      ethers.keccak256(request.data),
    ]
  );

  const hash = ethers.keccak256(encoded);

  const signature = await signer.signMessage(
    ethers.getBytes(hash)
  );

  // Send to backend relayer
  const response = await fetch("/api/gsn/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request, signature }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Gasless failed");
  }

  return result.txHash;
}
