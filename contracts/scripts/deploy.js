const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("NFT deployed to:", nftAddress);

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", marketplaceAddress);

  const frontendDir = path.join(__dirname, "../../frontend/src/constants");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const addresses = { nft: nftAddress, marketplace: marketplaceAddress };
  fs.writeFileSync(
    path.join(frontendDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  const nftArtifact = await hre.artifacts.readArtifact("NFT");
  fs.writeFileSync(
    path.join(frontendDir, "NFT.json"),
    JSON.stringify({ abi: nftArtifact.abi }, null, 2)
  );

  const marketplaceArtifact = await hre.artifacts.readArtifact("Marketplace");
  fs.writeFileSync(
    path.join(frontendDir, "Marketplace.json"),
    JSON.stringify({ abi: marketplaceArtifact.abi }, null, 2)
  );

  console.log("ABIs and addresses saved to frontend/src/constants/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
