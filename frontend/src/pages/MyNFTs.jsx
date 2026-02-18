import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import {
  getNFTContract,
  getMarketplaceContract,
  getReadOnlyProvider,
} from "../utils/contracts";
import { ipfsToHttp } from "../utils/pinata";
import addresses from "../constants/addresses.json";
import ListingForm from "../components/ListingForm";
import styles from "./MyNFTs.module.css";

export default function MyNFTs() {
  const { account, signer } = useWallet();
  const [myNFTs, setMyNFTs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyNFTs = useCallback(async () => {
    if (!account) {
      setMyNFTs([]);
      setLoading(false);
      return;
    }

    try {
      const provider = getReadOnlyProvider();
      const nft = getNFTContract(provider);
      const marketplace = getMarketplaceContract(provider);
      const tokenCount = await nft.getTokenCounter();

      const nfts = [];
      for (let i = 0; i < tokenCount; i++) {
        try {
          const owner = await nft.ownerOf(i);
          if (owner.toLowerCase() !== account.toLowerCase()) continue;

          const tokenURI = await nft.tokenURI(i);
          let metadata = { name: `NFT #${i}`, image: null };
          try {
            const res = await fetch(ipfsToHttp(tokenURI));
            metadata = await res.json();
          } catch {}

          const listing = await marketplace.getListing(addresses.nft, i);
          const isListed = listing.price > 0n;

          nfts.push({
            tokenId: i,
            name: metadata.name,
            image: metadata.image,
            isListed,
            price: isListed ? listing.price : null,
          });
        } catch {}
      }

      setMyNFTs(nfts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchMyNFTs();
  }, [fetchMyNFTs]);

  async function handleCancel(tokenId) {
    if (!signer) return;
    try {
      const marketplace = getMarketplaceContract(signer);
      const tx = await marketplace.cancelListing(addresses.nft, tokenId);
      await tx.wait();
      fetchMyNFTs();
    } catch (error) {
      console.error(error);
      alert("キャンセルに失敗しました: " + error.message);
    }
  }

  if (!account) return <p>ウォレットを接続してください</p>;
  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>My NFTs</h1>
      {myNFTs.length === 0 ? (
        <p>NFTを所有していません</p>
      ) : (
        <div className={styles.grid}>
          {myNFTs.map((nft) => (
            <div key={nft.tokenId} className={styles.card}>
              {nft.image && (
                <img
                  src={ipfsToHttp(nft.image)}
                  alt={nft.name}
                  className={styles.image}
                />
              )}
              <div className={styles.info}>
                <h3>{nft.name}</h3>
                {nft.isListed ? (
                  <div>
                    <p>出品中</p>
                    <button onClick={() => handleCancel(nft.tokenId)}>
                      出品キャンセル
                    </button>
                  </div>
                ) : (
                  <ListingForm
                    tokenId={nft.tokenId}
                    onListed={fetchMyNFTs}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
