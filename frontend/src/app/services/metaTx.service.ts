// src/app/services/metaTx.service.ts
import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import {
  ethers,
  BrowserProvider,
  Contract,
  Interface,
  AbiCoder
} from 'ethers';
import { request } from 'http';

@Injectable({
  providedIn: 'root'
})
export class MetaTxService {

  private TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes(
       "ForwardRequestData(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data)"
    )
  );

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
    console.log("MetaTx rawData:", rawData); 

    if (!(window as any).ethereum) {
      throw new Error("No wallet found");
    }

    // v6 provider
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const from = await signer.getAddress();

    // v6 contract
    const forwarderAddress = environment.forwarderAddress;
    const forwarder = new Contract(
      forwarderAddress,
      forwarderAbi,
      provider
    );

    const nonce = await forwarder['nonces'](from); // returns bigint in v6

    // v6 Interface
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

    const req = {
      from,
      to: targetAddress,
      value: "0",
      gas: "1000000",
      nonce: nonce.toString(), // bigint
      deadline,
      data
    };
    console.log("ForwardRequest being signed:", req);

    // v6 AbiCoder
    const domain = {
      name: "Forwarder",
      version: "1",
      chainId: (await provider.getNetwork()).chainId,// Base Sepolia
      verifyingContract: forwarderAddress
    };

   const types = {
  ForwardRequestData: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint48" },
    { name: "data", type: "bytes" }
  ]
};


    const signature = await signer.signTypedData(
      domain,
      types,
      {
        from: req.from,
        to: req.to,
        value: BigInt(req.value),
        gas: BigInt(req.gas),
        nonce: BigInt(req.nonce),
        deadline: BigInt(req.deadline),
        data: req.data
      }
    );
    return { req, signature };
  }
}
