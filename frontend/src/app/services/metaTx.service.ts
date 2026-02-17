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
  nonce: bigint;
  deadline: bigint;
  data: string;
}

interface ForwardRequestForRelayer {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  deadline: string;
  data: string;
}

@Injectable({
  providedIn: 'root',
})
export class MetaTxService {
  // src/app/services/metaTx.service.ts

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

  // ── Read current nonce ──
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

  // ── Fetch on-chain EIP-712 domain dynamically ──
  const domainInfo = await forwarder.getFunction('eip712Domain')();
  const [fields, name, version, chainId, verifyingContract, salt, extensions] = domainInfo;
  
  // ⚠️ IMPORTANT: Build domain EXACTLY as the contract returns it
  const domain: TypedDataDomain = {
    name,
    version,
    chainId: Number(chainId),
    verifyingContract,
  };

  // The fields byte tells us which optional fields are present
  const fieldsNum = Number(fields);
  console.log("Fields byte:", fieldsNum.toString(16));
  
  // Add salt only if the contract says it's present (bit 5)
  if (fieldsNum & 0x20) {
    domain.salt = "0x" + salt.toString(16).padStart(64, "0");
    console.log("Salt present:", domain.salt);
  }

  console.log("Final domain for signing:", domain);

  // Create request with ALL fields in the correct order
  const requestToSign: ForwardRequest = {
    from,
    to: targetAddress,
    value: 0n,
    gas: 1500000n,
    nonce: nonce,
    deadline: BigInt(deadlineSeconds),
    data,
  };

  console.log('ForwardRequest to sign:', {
    from: requestToSign.from,
    to: requestToSign.to,
    value: requestToSign.value.toString(),
    gas: requestToSign.gas.toString(),
    nonce: requestToSign.nonce.toString(),
    deadline: requestToSign.deadline.toString(),
    data: data.slice(0, 50) + (data.length > 50 ? '...' : ''),
  });

  // ⚠️ IMPORTANT: The types must match EXACTLY with the contract
  const types = {
    ForwardRequestData: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'gas', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint48' },
      { name: 'data', type: 'bytes' },
    ],
  };

  // Sign the typed data
  const signature = await signer.signTypedData(domain, types, requestToSign);

  console.log('Generated signature:', signature);

  // Off-chain verification
  const recovered = ethers.verifyTypedData(domain, types, requestToSign, signature);
  console.log('Recovered address:', recovered);
  console.log('Signature matches signer?', recovered.toLowerCase() === from.toLowerCase());

  // Prepare payload for backend
  const requestForRelayer: ForwardRequestForRelayer = {
    from,
    to: targetAddress,
    value: '0',
    gas: requestToSign.gas.toString(),
    nonce: requestToSign.nonce.toString(),
    deadline: requestToSign.deadline.toString(),
    data,
  };

  return { request: requestForRelayer, signature };
}
}