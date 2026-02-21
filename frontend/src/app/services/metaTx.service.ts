import { environment } from '../../environments/environment.prod';
import { Injectable } from '@angular/core';
import {
  ethers,
  BrowserProvider,
  Contract,
  Interface,
  TypedDataDomain,
} from 'ethers';

// This matches the ABI struct precisely
interface ForwardRequestForRelayer {
  from: string;
  to: string;
  value: string;
  gas: string;
  deadline: string;
  data: string;
  signature: string; // The contract expects signature inside the struct
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
  }): Promise<{request: ForwardRequestForRelayer; signature: string }> {
    if (!(window as any).ethereum) {
      throw new Error('No wallet found.');
    }

    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const from = await signer.getAddress();
    const forwarderAddress = environment.FORWARDER_ADDRESS;
    const forwarder = new Contract(forwarderAddress, forwarderAbi, provider);

    // 1. Get the current nonce - Required for signing even if not in the struct
    const nonce = await forwarder['nonces'](from);

    // 2. Prepare calldata
    let data: string;
    if (rawData) {
      data = rawData;
    } else {
      if (!targetAbi || !functionName) throw new Error('Missing target details');
      const iface = new Interface(targetAbi);
      data = iface.encodeFunctionData(functionName, functionArgs ?? []);
    }

    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // 3. Dynamic Domain Fetching
    const domainInfo = await forwarder['eip712Domain']();
    const [fields, name, version, chainId, verifyingContract] = domainInfo;
    
    const domain: TypedDataDomain = {
      name,
      version,
      chainId: Number(chainId),
      verifyingContract,
    };

    // 4. EIP-712 Types 
    // IMPORTANT: 'nonce' MUST be here for the signature to be valid on-chain
    const types = {
      ForwardRequest: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }, 
        { name: 'deadline', type: 'uint48' },
        { name: 'data', type: 'bytes' },
      ],
    };

    // 5. The Message to sign (Includes nonce)
    const message = {
      from,
      to: targetAddress,
      value: 0n,
      gas: 1500000n,
      nonce: nonce, 
      deadline: BigInt(deadline),
      data,
    };

    // Sign with the nonce
    const signature = await signer.signTypedData(domain, types, message);

    // 6. Final Payload (Matches your ABI: No nonce, includes signature)
    const requestForRelayer: ForwardRequestForRelayer = {
      from: message.from,
      to: message.to,
      value: message.value.toString(),
      gas: message.gas.toString(),
      deadline: message.deadline.toString(),
      data: message.data,
      signature: signature
    };

    console.log("Ready for forwarder.verify(requestForRelayer)");
    return {request: requestForRelayer, signature};
  }
}
