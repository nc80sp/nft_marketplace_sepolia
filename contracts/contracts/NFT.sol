// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFT is ERC721URIStorage {
    uint256 private _tokenCounter;

    constructor() ERC721("Marketplace NFT", "MNFT") {
        _tokenCounter = 0;
    }

    function mint(string memory tokenURI) external returns (uint256) {
        uint256 tokenId = _tokenCounter;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        _tokenCounter++;
        return tokenId;
    }

    function getTokenCounter() external view returns (uint256) {
        return _tokenCounter;
    }
}
