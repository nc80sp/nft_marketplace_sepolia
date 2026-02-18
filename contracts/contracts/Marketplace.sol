// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace {
    struct Listing {
        uint256 price;
        address seller;
    }

    mapping(address => mapping(uint256 => Listing)) private _listings;

    event ItemListed(address indexed seller, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event ItemBought(address indexed buyer, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event ItemCanceled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId);

    function listItem(address nftAddress, uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than zero");
        IERC721 nftContract = IERC721(nftAddress);
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(_listings[nftAddress][tokenId].price == 0, "Already listed");
        _listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    function buyItem(address nftAddress, uint256 tokenId) external payable {
        Listing memory listing = _listings[nftAddress][tokenId];
        require(listing.price > 0, "Not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        delete _listings[nftAddress][tokenId];
        IERC721(nftAddress).safeTransferFrom(listing.seller, msg.sender, tokenId);
        (bool success, ) = payable(listing.seller).call{value: listing.price}("");
        require(success, "Payment failed");
        emit ItemBought(msg.sender, nftAddress, tokenId, listing.price);
    }

    function cancelListing(address nftAddress, uint256 tokenId) external {
        Listing memory listing = _listings[nftAddress][tokenId];
        require(listing.price > 0, "Not listed");
        require(listing.seller == msg.sender, "Not the seller");
        delete _listings[nftAddress][tokenId];
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    function getListing(address nftAddress, uint256 tokenId) external view returns (Listing memory) {
        return _listings[nftAddress][tokenId];
    }
}
