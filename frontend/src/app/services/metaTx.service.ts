// src/app/services/metaTx.service.ts
import { environment } from '../../environments/environment.prod';
import { Injectable } from '@angular/core';
import {
  ethers,
  BrowserProvider,
  Contract,
  Interface,
} from 'ethers';

@Injectable({
  providedIn: 'root'
})
export class MetaTxService {

  async buildAndSignMetaTx({
    forwarderAbi,
    targetAddress,
    targetAbi,
    functionName,
    functionArgs,
    rawData
  }: {
    forwarderAbi: any[];
    targetAddress: string;
    targetAbi?: any[];
    functionName?: string;
    functionArgs?: any[];
    rawData?: string;
  }) {
    if (!(window as any).ethereum) {
      throw new Error("No wallet found");
    }

    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const from = await signer.getAddress();

    const forwarderAddress = environment.FORWARDER_ADDRESS;
    const forwarder = new Contract(forwarderAddress, forwarderAbi, provider);

    // Read nonce (for UI only)
    const nonce = await forwarder.getFunction("nonces")(from);
    console.log("Current nonce (not signed):", nonce.toString());

    // Prepare target calldata
    let data: string;
    if (rawData) {
      data = rawData;
    } else {
      if (!targetAbi || !functionName) {
        throw new Error("Either rawData or (targetAbi + functionName) must be provided");
      }
      const iface = new Interface(targetAbi);
      data = iface.encodeFunctionData(functionName, functionArgs ?? []);
    }

    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    // === CRITICAL FIX: Use dynamic domain from contract ===
    const domainInfo = await forwarder.getFunction("eip712Domain")();
    console.log("Using on-chain domain from contract:", {
      name: domainInfo.name,
      version: domainInfo.version,
      chainId: domainInfo.chainId.toString(),
      verifyingContract: domainInfo.verifyingContract
    });

    const domain = {
      name: domainInfo.name,
      version: domainInfo.version,
      chainId: Number(domainInfo.chainId),
      verifyingContract: domainInfo.verifyingContract
    };

    const requestToSign = {
      from,
      to: targetAddress,
      value: 0n,
      gas: 1000000n,
      deadline: BigInt(deadline),
      data
    };

    console.log("=== ForwardRequestData being signed (dynamic domain) ===");
    console.log("Value being signed:", {
      from: requestToSign.from,
      to: requestToSign.to,
      value: "0",
      gas: "1000000",
      deadline: requestToSign.deadline.toString(),
      data: requestToSign.data.slice(0, 20) + "..."
    });

    const types = {
      ForwardRequestData: [
        { name: "from",     type: "address" },
        { name: "to",       type: "address" },
        { name: "value",    type: "uint256" },
        { name: "gas",      type: "uint256" },
        { name: "deadline", type: "uint48"  },
        { name: "data",     type: "bytes"   }
      ]
    };

    const signature = await signer.signTypedData(domain, types, requestToSign);

    console.log("Signature produced:", signature);

    const recovered = ethers.verifyTypedData(domain, types, requestToSign, signature);
    console.log("Off-chain recovered:", recovered);
    console.log("Matches wallet?", recovered.toLowerCase() === from.toLowerCase());

    // Send to backend
    const requestForRelayer = {
      from,
      to: targetAddress,
      value: "0",
      gas: "1000000",
      deadline: deadline.toString(),
      data
    };

    return { request: requestForRelayer, signature };
  }
}