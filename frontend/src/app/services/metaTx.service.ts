// src/app/services/metaTx.service.ts
import { environment } from '../../environments/environment';
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
    // Optional when rawData is used
    targetAbi?: any[];
    functionName?: string;
    functionArgs?: any[];
    rawData?: string;
  }) {
    if (!(window as any).ethereum) {
      throw new Error("No wallet found");
    }

    // Provider & signer
    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const from = await signer.getAddress();

    // Forwarder contract (just to read nonces – not needed for signing)
    const forwarderAddress = environment.forwarderAddress;
    const forwarder = new Contract(
      forwarderAddress,
      forwarderAbi,
      provider
    );

    // We read nonce mostly for UI/debug purposes or to prevent replays client-side
    // But **do NOT** include it in the signed typed data
    const nonce = await forwarder['nonces'](from);

    // Prepare calldata for the target contract
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

    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // ────────────────────────────────────────────────
    //  The struct we will sign — IMPORTANT: NO nonce here
    // ────────────────────────────────────────────────
    const requestToSign = {
      from,
      to: targetAddress,
      value: 0n,                    // use bigint
      gas: 1000000n,                // reasonable default – can be estimated later
      deadline: BigInt(deadline),
      data,
      signature: "0x" as `0x${string}`   // placeholder — ethers will replace it
    };

    console.log("ForwardRequest being signed (without nonce):", {
      ...requestToSign,
      value: requestToSign.value.toString(),
      gas: requestToSign.gas.toString(),
      deadline: requestToSign.deadline.toString(),
    });

    // EIP-712 domain — must match exactly what the contract uses
    const domain = {
      name: "Forwarder",
      version: "1",
      chainId: 84532, //Number((await provider.getNetwork()).chainId),
      verifyingContract: forwarderAddress,
    };

    // Type definition — must match ERC2771Forwarder.sol exactly
    const types = {
      ForwardRequestData: [
        { name: "from",     type: "address" },
        { name: "to",       type: "address" },
        { name: "value",    type: "uint256" },
        { name: "gas",      type: "uint256" },
        { name: "deadline", type: "uint48"  },
        { name: "data",     type: "bytes"   },
        { name: "signature", type: "bytes"  }
      ]
    };

    // Sign typed data
    const signature = await signer.signTypedData(
      domain,
      types,
      requestToSign
    );

    // ────────────────────────────────────────────────
    //          ADD THE DEBUG LOGS HERE
    // ────────────────────────────────────────────────
    console.log("=== Signing Debug ===");
    console.log("Domain:", JSON.stringify(domain, (k,v) => 
      typeof v === 'bigint' ? v.toString() : v
    ));
    console.log("Types:", types.ForwardRequestData);
    console.log("Value being signed:", {
      from: requestToSign.from,
      to: requestToSign.to,
      value: requestToSign.value.toString(),
      gas: requestToSign.gas.toString(),
      deadline: requestToSign.deadline.toString(),
      data: requestToSign.data.slice(0, 10) + "...", // truncate
      signaturePlaceholder: requestToSign.signature
    });
    console.log("Signature produced:", signature);
    // ────────────────────────────────────────────────

    // What we send to the backend/relayer (still no nonce)
    const requestForRelayer = {
      from,
      to: targetAddress,
      value: "0",
      gas: "1000000",
      deadline: deadline.toString(),
      data
      // NO nonce here
    };

    return {
      request: requestForRelayer,
      signature
    };
  }
}