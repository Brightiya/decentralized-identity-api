import { jest } from "@jest/globals";

export const mockProvider = {
  getNetwork: jest.fn().mockResolvedValue({ chainId: 31337 }),
  getBlockNumber: jest.fn().mockResolvedValue(123),
  getSigner: jest.fn().mockReturnValue({
    getAddress: jest.fn().mockResolvedValue(
      "0x000000000000000000000000000000000000dEaD"
    ),
    signMessage: jest.fn().mockResolvedValue("0xmockedsignature"),
  }),
};
