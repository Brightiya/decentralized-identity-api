import { environment } from '../../environments/environment.prod';
import { Injectable } from '@angular/core';
import {
  ethers,
  BrowserProvider,
  Contract,
  Interface,
  TypedDataDomain,
} from 'ethers';

/*
  TypeScript interface representing the struct that will be sent
  to the relayer backend and ultimately passed to the Forwarder contract.

  IMPORTANT:
  This must match the Solidity struct expected by the forwarder contract.
*/
interface ForwardRequestForRelayer {
  from: string;       // User wallet initiating the meta transaction
  to: string;         // Target contract address
  value: string;      // ETH value sent with transaction (usually 0 for meta-tx)
  gas: string;        // Gas limit the relayer should use
  deadline: string;   // Expiration timestamp
  data: string;       // Encoded calldata for target function
  signature: string;  // User's EIP-712 signature
}

@Injectable({
  providedIn: 'root',
})
export class MetaTxService {

  /*
    Builds and signs a meta-transaction request.

    Responsibilities:
    - Prepare calldata for the target contract
    - Fetch the forwarder nonce
    - Construct EIP-712 typed data
    - Ask the user's wallet to sign the request
    - Return a payload ready to send to the relayer backend
  */
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

    // Ensure the user has an injected Ethereum wallet (e.g., MetaMask)
    if (!(window as any).ethereum) {
      throw new Error('No wallet found.');
    }

    /*
      Create ethers provider connected to the user's wallet
      BrowserProvider wraps window.ethereum
    */
    const provider = new BrowserProvider((window as any).ethereum);

    // Get signer (user account)
    const signer = await provider.getSigner();

    // Address of the user signing the meta transaction
    const from = await signer.getAddress();

    // Forwarder contract address from environment config
    const forwarderAddress = environment.FORWARDER_ADDRESS;

    // Forwarder contract instance
    const forwarder = new Contract(forwarderAddress, forwarderAbi, provider);

    /*
      1. Fetch the current nonce for this user from the forwarder contract.

      The nonce protects against replay attacks and must be included
      in the EIP-712 signed message.
    */
    const nonce = await forwarder['nonces'](from);

    /*
      2. Prepare calldata for the target contract.

      Either:
      - Use provided rawData
      OR
      - Encode function call using ABI + function arguments
    */
    let data: string;

    if (rawData) {
      // Raw calldata provided directly
      data = rawData;
    } else {

      if (!targetAbi || !functionName) {
        throw new Error('Missing target details');
      }

      // Create ABI interface for encoding function calls
      const iface = new Interface(targetAbi);

      // Encode the function call into calldata
      data = iface.encodeFunctionData(functionName, functionArgs ?? []);
    }

    /*
      Deadline timestamp to limit how long this request is valid.

      Here it expires in 1 hour.
    */
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    /*
  Estimate gas for the target contract call.

  We simulate the call from the user address because
  ERC2771 contracts expect the original sender.
*/
  let estimatedGas: bigint;

  try {

    const gasEstimate = await provider.estimateGas({
      from: from,
      to: targetAddress,
      data: data,
      value: 0
    });

    /*
      Add a 30% safety buffer.

      This prevents failures due to:
      - storage expansion
      - network variance
      - internal contract calls
    */
    estimatedGas = (gasEstimate * 130n) / 100n;
/*
  Prevent extremely large gas values that could drain
  the relayer if someone crafts a malicious call.
*/
// Cap maximum gas allowed for relayer
  const MAX_RELAY_GAS = 2_000_000n;

  if (estimatedGas > MAX_RELAY_GAS) {
    estimatedGas = MAX_RELAY_GAS;
  }

  } catch (err) {

    /*
      If estimation fails we fallback to a safe default
      so the UI does not break.
    */
    console.warn("Gas estimation failed, using fallback.", err);

    estimatedGas = 1500000n;
    const MAX_RELAY_GAS = 2_000_000n;

  if (estimatedGas > MAX_RELAY_GAS) {
    estimatedGas = MAX_RELAY_GAS;
  }
  }

    /*
      3. Dynamically fetch EIP-712 domain parameters
      from the forwarder contract.

      This ensures frontend and contract domains always match.
    */
    const domainInfo = await forwarder['eip712Domain']();

    const [fields, name, version, chainId, verifyingContract] = domainInfo;
    
    const domain: TypedDataDomain = {
      name,
      version,
      chainId: Number(chainId),
      verifyingContract,
    };

    /*
      4. Define the EIP-712 typed data schema.

      IMPORTANT:
      The 'nonce' field MUST be present here
      even though it is not inside the struct sent to execute().
    */
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

    /*
      5. Construct the message that the user will sign.

      This message must exactly match what the forwarder
      contract verifies internally.
    */
    const message = {
      from,
      to: targetAddress,
      value: 0n,               // Meta transactions typically send no ETH
      gas: estimatedGas,           // Gas limit the relayer should use
      nonce: nonce, 
      deadline: BigInt(deadline),
      data,
    };

    /*
      Ask the user's wallet to sign the EIP-712 typed data.

      This proves that the user authorized the transaction.
    */
    const signature = await signer.signTypedData(domain, types, message);

    /*
      6. Construct the final payload that will be sent
      to the relayer backend.

      IMPORTANT:
      The request struct expected by the forwarder does NOT
      contain the nonce, but it DOES contain the signature.
    */
    const requestForRelayer: ForwardRequestForRelayer = {
      from: message.from,
      to: message.to,
      value: message.value.toString(),
      gas: message.gas.toString(),
      deadline: message.deadline.toString(),
      data: message.data,
      signature: signature
    };

    /*
      At this point the payload is ready to be sent to the relayer.
      The relayer will call forwarder.verify(request) before executing.
    */
    console.log("Ready for forwarder.verify(requestForRelayer)");

    return {request: requestForRelayer, signature};
  }
}