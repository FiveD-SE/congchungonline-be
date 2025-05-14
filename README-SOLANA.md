# Trusity Backend - Solana Integration

This document outlines how to set up and use the Solana blockchain integration for the Trusity notarization platform.

## Prerequisites

- Node.js v14+ and npm/yarn
- Solana CLI (optional but recommended for testing)
- An Arweave wallet for permanent storage

## Required Dependencies

Install the following dependencies:

```bash
npm install @solana/web3.js @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults @metaplex-foundation/mpl-token-metadata bs58 arweave
```

## Environment Variables

Add these variables to your `.env` file:

```
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_base58_encoded_private_key

# Arweave Configuration
ARWEAVE_HOST=arweave.net
ARWEAVE_PORT=443
ARWEAVE_PROTOCOL=https
ARWEAVE_WALLET_JWK={"your_arweave_wallet_jwk"}
```

### Generate Solana Keys (Development)

To generate a Solana keypair for development:

```javascript
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

const keypair = Keypair.generate();
console.log('Public Key:', keypair.publicKey.toString());
console.log('Private Key (base58):', bs58.encode(keypair.secretKey));
```

### Fund Your Development Wallet

For the Solana devnet:

```bash
solana airdrop 2 YOUR_PUBLIC_KEY --url https://api.devnet.solana.com
```

## File Structure

The Solana implementation consists of these main files:

- `src/config/blockchain-solana.js` - Core Solana blockchain functionality
- `src/services/notarization.service-solana.js` - Solana-specific notarization logic
- `src/services/userWallet-solana.service.js` - Wallet management for Solana NFTs

## Key Components

### Arweave Storage

Document files and metadata are stored on Arweave for permanent decentralized storage. This has replaced IPFS in the original Ethereum implementation.

### NFT Minting

NFTs are minted using Metaplex's Token Metadata program, which is the standard for Solana NFTs.

### Wallet Management

The wallet service has been enhanced to support Solana-specific functionality, including on-chain synchronization.

## Usage

### Notarizing a Document

The document notarization flow remains the same as the Ethereum implementation but now uses Solana under the hood:

1. Upload document through the existing API endpoints
2. Process the document through normal workflow (pending → processing → digitalSignature)
3. When a notary approves, the document is:
   - Uploaded to Arweave
   - Minted as an NFT on Solana
   - Added to the user's wallet

### Important API Changes

Replace calls to `approveSignatureByNotary` with `approveSignatureByNotarySolana` when using the Solana implementation.

## Testing

To test the implementation:

1. Create a document through the normal API flow
2. Approve the document through the user and notary flow
3. Verify the document appears in the user's wallet
4. Check Solana Explorer (explorer.solana.com) to confirm the NFT transaction

## Troubleshooting

### Arweave Upload Issues

- Check that your Arweave wallet has enough AR tokens
- Verify the ARWEAVE_WALLET_JWK format is correct

### Solana Transaction Failures

- Ensure your Solana wallet has enough SOL
- Check transaction logs using `solana logs YOUR_SIGNATURE`
- Verify RPC endpoint is responsive

## Production Considerations

For production deployment:

1. Use a dedicated Arweave wallet with sufficient funds
2. Consider using a hardware wallet for Solana key security
3. Implement transaction retry mechanisms
4. Add monitoring for blockchain transactions

## Database Schema

The current database schema supports both Ethereum and Solana implementations. The primary difference is in the token identifiers:

- Ethereum uses `tokenId` and `contractAddress`
- Solana uses `mintAddress` (stored in both `tokenId` and `contractAddress` fields for compatibility)

## Security Considerations

- Never store private keys in code or expose them to clients
- Use environment variables for all sensitive configuration
- Consider implementing rate limiting for blockchain operations
- Implement robust error handling for transaction failures
