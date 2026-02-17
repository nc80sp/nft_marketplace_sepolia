import { useParams } from "react-router-dom";

export default function NFTDetail() {
  const { address, tokenId } = useParams();
  return <h1>NFT Detail: {address} #{tokenId}</h1>;
}
