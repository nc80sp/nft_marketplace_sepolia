import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getNFTContract, getMarketplaceContract } from "../utils/contracts";
import addresses from "../constants/addresses.json";
import styles from "./ListingForm.module.css";

export default function ListingForm({ tokenId, onListed }) {
  const { signer } = useWallet();
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!price || parseFloat(price) <= 0) return;

    try {
      setLoading(true);
      const nft = getNFTContract(signer);
      const marketplace = getMarketplaceContract(signer);

      const approveTx = await nft.approve(addresses.marketplace, tokenId);
      await approveTx.wait();

      const priceWei = ethers.parseEther(price);
      const listTx = await marketplace.listItem(addresses.nft, tokenId, priceWei);
      await listTx.wait();

      setPrice("");
      if (onListed) onListed();
    } catch (error) {
      console.error(error);
      alert("出品に失敗しました: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="number"
        step="0.001"
        min="0"
        placeholder="Price (ETH)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? "処理中..." : "出品"}
      </button>
    </form>
  );
}
