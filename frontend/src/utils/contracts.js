import { ethers } from "ethers";
import NFTArtifact from "../constants/NFT.json";
import MarketplaceArtifact from "../constants/Marketplace.json";
import addresses from "../constants/addresses.json";

export function getNFTContract(signerOrProvider) {
  return new ethers.Contract(addresses.nft, NFTArtifact.abi, signerOrProvider);
}

export function getMarketplaceContract(signerOrProvider) {
  return new ethers.Contract(
    addresses.marketplace,
    MarketplaceArtifact.abi,
    signerOrProvider
  );
}

export function getReadOnlyProvider() {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
  if (rpcUrl) {
    return new ethers.JsonRpcProvider(rpcUrl);
  }
  return ethers.getDefaultProvider("sepolia");
}
