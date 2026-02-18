const PINATA_API_URL = "https://api.pinata.cloud";

export async function uploadFileToIPFS(file) {
  const apiKey = import.meta.env.VITE_PINATA_API_KEY;
  const secret = import.meta.env.VITE_PINATA_SECRET;

  if (!apiKey || !secret) {
    throw new Error("Pinata API keys not configured. Check frontend/.env");
  }

  const ext = file.name.split(".").pop() || "png";
  const renamedFile = new File([file], `nft-${Date.now()}.${ext}`, { type: file.type });
  const formData = new FormData();
  formData.append("file", renamedFile);

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: secret,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Pinata upload error:", response.status, errorText);
    throw new Error(`Failed to upload file to IPFS: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

export async function uploadJSONToIPFS(json) {
  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
      pinata_secret_api_key: import.meta.env.VITE_PINATA_SECRET,
    },
    body: JSON.stringify(json),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Pinata JSON upload error:", response.status, errorText);
    throw new Error(`Failed to upload JSON to IPFS: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

export function ipfsToHttp(ipfsUri) {
  if (!ipfsUri) return "";
  return ipfsUri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
}
