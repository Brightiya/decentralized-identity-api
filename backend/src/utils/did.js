export const didToAddress = (didOrAddress) => {
  if (!didOrAddress) return didOrAddress;
  
  let addr = didOrAddress;
  
  // Strip any did: prefix
  if (addr.startsWith('did:')) {
    addr = addr.split(':').pop();
  }
  
  // Force lowercase + ensure 0x prefix
  if (addr.startsWith('0x')) {
    addr = addr.slice(2);
  }
  
  addr = addr.toLowerCase();
  
  // Basic validation (optional but good)
  if (!/^[0-9a-f]{40}$/.test(addr)) {
    console.warn('Invalid address format:', didOrAddress);
  }
  
  return '0x' + addr;
};
