import { useState, useEffect } from "react";
import { getMarketplaceContract, getNFTContract, getReadOnlyProvider } from "../utils/contracts";
import { ipfsToHttp } from "../utils/pinata";
import addresses from "../constants/addresses.json";
import NFTCard from "../components/NFTCard";
import styles from "./Home.module.css";

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      try {
        const provider = getReadOnlyProvider();
        const marketplace = getMarketplaceContract(provider);
        const nft = getNFTContract(provider);
        const tokenCount = await nft.getTokenCounter();

        const activeListings = [];

        for (let i = 0; i < tokenCount; i++) {
          try {
            const listing = await marketplace.getListing(addresses.nft, i);
            if (listing.price > 0n) {
              const tokenURI = await nft.tokenURI(i);
              let name = null;
              let image = null;
              try {
                const res = await fetch(ipfsToHttp(tokenURI));
                const metadata = await res.json();
                name = metadata.name;
                image = metadata.image;
              } catch {}

              activeListings.push({
                nftAddress: addresses.nft,
                tokenId: i,
                price: listing.price,
                seller: listing.seller,
                name,
                image,
              });
            }
          } catch {}
        }

        setListings(activeListings);
      } catch (error) {
        console.error("Failed to fetch listings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Marketplace</h1>
      {listings.length === 0 ? (
        <p>出品中のNFTはありません</p>
      ) : (
        <div className={styles.grid}>
          {listings.map((item) => (
            <NFTCard
              key={`${item.nftAddress}-${item.tokenId}`}
              nftAddress={item.nftAddress}
              tokenId={item.tokenId.toString()}
              price={item.price}
              image={item.image}
              name={item.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
