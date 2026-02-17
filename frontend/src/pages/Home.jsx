import { useState, useEffect } from "react";
import { getMarketplaceContract, getNFTContract, getReadOnlyProvider } from "../utils/contracts";
import { ipfsToHttp } from "../utils/pinata";
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

        const listedFilter = marketplace.filters.ItemListed();
        const boughtFilter = marketplace.filters.ItemBought();
        const canceledFilter = marketplace.filters.ItemCanceled();

        const [listedEvents, boughtEvents, canceledEvents] = await Promise.all([
          marketplace.queryFilter(listedFilter),
          marketplace.queryFilter(boughtFilter),
          marketplace.queryFilter(canceledFilter),
        ]);

        const activeListings = new Map();

        for (const event of listedEvents) {
          const key = `${event.args.nftAddress}-${event.args.tokenId}`;
          activeListings.set(key, {
            nftAddress: event.args.nftAddress,
            tokenId: event.args.tokenId,
            price: event.args.price,
            seller: event.args.seller,
          });
        }

        for (const event of boughtEvents) {
          const key = `${event.args.nftAddress}-${event.args.tokenId}`;
          activeListings.delete(key);
        }

        for (const event of canceledEvents) {
          const key = `${event.args.nftAddress}-${event.args.tokenId}`;
          activeListings.delete(key);
        }

        const listingsWithMetadata = await Promise.all(
          Array.from(activeListings.values()).map(async (listing) => {
            try {
              const nft = getNFTContract(provider);
              const tokenURI = await nft.tokenURI(listing.tokenId);
              const metadataUrl = ipfsToHttp(tokenURI);
              const res = await fetch(metadataUrl);
              const metadata = await res.json();
              return { ...listing, name: metadata.name, image: metadata.image };
            } catch {
              return { ...listing, name: null, image: null };
            }
          })
        );

        setListings(listingsWithMetadata);
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
