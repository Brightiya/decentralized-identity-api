// src/app/services/metaTx.service.ts
import { environment } from '../../environments/environment.prod';
import { Injectable } from '@angular/core';
import {
  ethers,
  BrowserProvider,
  Contract,
  Interface,
  TypedDataDomain,
  TypedDataField,
} from 'ethers';

interface ForwardRequest {
  from: string;
  to: string;
  value: bigint;
  gas: bigint;
  nonce:bigint;
  deadline: bigint;
  data: string;
}

interface ForwardRequestForRelayer {
  from: string;
  to: string;
  value: string;
  gas: string;
  deadline: string;
  data: string;
}

@Injectable({
  providedIn: 'root',
})
export class MetaTxService {
  async buildAndSignMetaTx({
    forwarderAbi,
    targetAddress,
    targetAbi,
    functionName,
    functionArgs,
    rawData,
  }: {
    forwarderAbi: any[];
    targetAddress: string;
    targetAbi?: any[];
    functionName?: string;
    functionArgs?: any[];
    rawData?: string;
  }): Promise<{ request: ForwardRequestForRelayer; signature: string }> {
    if (!(window as any).ethereum) {
      throw new Error('No wallet found. Please install a Web3 wallet.');
    }

    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const from = await signer.getAddress();

    const forwarderAddress = environment.FORWARDER_ADDRESS;
    const forwarder = new Contract(forwarderAddress, forwarderAbi, provider);

    // ── Read current nonce (UI/debug only) ──
    const nonce = await forwarder.getFunction('nonces')(from);
    console.log(`Current nonce for ${from}:`, nonce.toString());

    // ── Prepare target calldata ──
    let data: string;
    if (rawData) {
      data = rawData;
    } else {
      if (!targetAbi || !functionName) {
        throw new Error('Either rawData or (targetAbi + functionName + functionArgs) must be provided');
      }
      const iface = new Interface(targetAbi);
      data = iface.encodeFunctionData(functionName, functionArgs ?? []);
    }

    const deadlineSeconds = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // ── Fetch on-chain EIP-712 domain dynamically (strongly recommended) ──
    const domainInfo = await forwarder.getFunction('eip712Domain')();

   // domainInfo is tuple: [fields (bytes1), name, version, chainId, verifyingContract, salt, extensions]
    const [fields, name, version, chainId, verifyingContract, salt, extensions] = domainInfo;
    // Convert fields (bytes1) to bigint for bit check
    const fieldsBig = BigInt(fields);

    const domain: TypedDataDomain = {
      name,
      version,
      chainId: Number(chainId), // ethers v6 signTypedData accepts number here
      verifyingContract,
      // salt?: string;           // include only if your forwarder uses salt
      // extensions?: bigint[];   // include only if present and needed
    };

    if (fieldsBig & 0x20n) {  // bit 5 = salt present
      // salt is bigint → convert to hex string (ethers expects "0x...")
      domain.salt = "0x" + salt.toString(16).padStart(64, "0");
    }

    if (extensions.length > 0) {
      console.warn("Extensions present – may need handling");
    }

    console.log("Final domain for signing:", domain);

    console.log('Using on-chain EIP-712 domain:', domain);

    const requestToSign: ForwardRequest = {
      from,
      to: targetAddress,
      value: 0n,
      gas: 1500000n, // increased default – adjust per your typical calls or estimate
      nonce,
      deadline: BigInt(deadlineSeconds),
      data,
    };

    console.log('ForwardRequest to sign:', {
      ...requestToSign,
      value: requestToSign.value.toString(),
      gas: requestToSign.gas.toString(),
      deadline: requestToSign.deadline.toString(),
      data: data.slice(0, 30) + (data.length > 30 ? '...' : ''),
    });

    const types = {
      ForwardRequestData: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: "nonce",    type: "uint256" },
        { name: 'deadline', type: 'uint48' },
        { name: 'data', type: 'bytes' },
      ] as TypedDataField[],
    };

    const signature = await signer.signTypedData(domain, types, requestToSign);

    console.log('Generated signature:', signature);

    // Optional: off-chain verification (very useful during dev)
    const recovered = ethers.verifyTypedData(domain, types, requestToSign, signature);
    console.log('Recovered address:', recovered);
    console.log('Signature matches signer?', recovered.toLowerCase() === from.toLowerCase());

    // Prepare payload for backend (stringify bigints)
    const requestForRelayer: ForwardRequestForRelayer = {
      from,
      to: targetAddress,
      value: '0',
      gas: requestToSign.gas.toString(),
      deadline: requestToSign.deadline.toString(),
      data,
    };

    return { request: requestForRelayer, signature };
  }
}