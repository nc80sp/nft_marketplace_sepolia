import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import {
  getMarketplaceContract,
  getNFTContract,
  getReadOnlyProvider,
} from "../utils/contracts";
import { ipfsToHttp } from "../utils/pinata";
import styles from "./NFTDetail.module.css";

export default function NFTDetail() {
  const { address, tokenId } = useParams();
  const { signer, account } = useWallet();
  const [metadata, setMetadata] = useState(null);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [txStatus, setTxStatus] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const provider = getReadOnlyProvider();
        const nft = getNFTContract(provider);
        const marketplace = getMarketplaceContract(provider);

        const tokenURI = await nft.tokenURI(tokenId);
        const res = await fetch(ipfsToHttp(tokenURI));
        const meta = await res.json();
        setMetadata(meta);

        const listingData = await marketplace.getListing(address, tokenId);
        if (listingData.price > 0n) {
          setListing({
            price: listingData.price,
            seller: listingData.seller,
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [address, tokenId]);

  async function handleBuy() {
    if (!signer) {
      setTxStatus("ウォレットを接続してください");
      return;
    }
    try {
      setTxStatus("購入処理中...");
      const marketplace = getMarketplaceContract(signer);
      const tx = await marketplace.buyItem(address, tokenId, {
        value: listing.price,
      });
      await tx.wait();

      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_watchAsset",
            params: {
              type: "ERC721",
              options: {
                address: address,
                tokenId: tokenId,
              },
            },
          });
        } catch {}
      }

      setTxStatus("購入成功！");
      setListing(null);
    } catch (error) {
      console.error(error);
      setTxStatus("エラー: " + error.message);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!metadata) return <p>NFTが見つかりません</p>;

  return (
    <div className={styles.container}>
      <img
        src={ipfsToHttp(metadata.image)}
        alt={metadata.name}
        className={styles.image}
      />
      <div className={styles.details}>
        <h1>{metadata.name}</h1>
        <p>{metadata.description}</p>
        {listing ? (
          <div>
            <p className={styles.price}>
              {ethers.formatEther(listing.price)} ETH
            </p>
            <p className={styles.seller}>
              Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
            </p>
            {account &&
            account.toLowerCase() !== listing.seller.toLowerCase() ? (
              <button onClick={handleBuy} className={styles.buyButton}>
                購入する
              </button>
            ) : null}
          </div>
        ) : (
          <p>現在出品されていません</p>
        )}
        {txStatus && <p>{txStatus}</p>}
      </div>
    </div>
  );
}
