// src/app/services/metaTx.service.ts

import { Injectable } from '@angular/core';
import {
  ethers,
  BrowserProvider,
  Contract,
  Interface,
  AbiCoder
} from 'ethers';

@Injectable({
  providedIn: 'root'
})
export class MetaTxService {

  private TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes(
      "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
    )
  );

  async buildAndSignMetaTx({
    forwarderAddress,
    forwarderAbi,
    targetAddress,
    targetAbi,
    functionName,
    functionArgs
  }: {
    forwarderAddress: string;
    forwarderAbi: any[];
    targetAddress: string;
    targetAbi: any[];
    functionName: string;
    functionArgs: any[];
  }) {

    if (!(window as any).ethereum) {
      throw new Error("No wallet found");
    }

    // v6 provider
    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const from = await signer.getAddress();

    // v6 contract
    const forwarder = new Contract(
      forwarderAddress,
      forwarderAbi,
      provider
    );

    const nonce = await forwarder['getNonce'](from); // returns bigint in v6

    // v6 Interface
    const iface = new Interface(targetAbi);
    const data = iface.encodeFunctionData(functionName, functionArgs);

    const req = {
      from,
      to: targetAddress,
      value: 0n,
      gas: 1_000_000n,
      nonce, // bigint
      data
    };

    // v6 AbiCoder
    const abiCoder = AbiCoder.defaultAbiCoder();

    const hash = ethers.keccak256(
      abiCoder.encode(
        [
          "bytes32",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "bytes32"
        ],
        [
          this.TYPEHASH,
          req.from,
          req.to,
          req.value,
          req.gas,
          req.nonce,
          ethers.keccak256(req.data)
        ]
      )
    );

    const signature = await signer.signMessage(
      ethers.getBytes(hash)
    );

    return { req, signature };
  }
}
