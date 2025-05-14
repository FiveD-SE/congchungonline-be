const PinataSDK = require('@pinata/sdk');
require('dotenv').config();
const { Readable } = require('stream');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { bs58 } = require('@project-serum/anchor/dist/cjs/utils/bytes');
const { Wallet, AnchorProvider, Program, web3 } = require('@project-serum/anchor');
const { findProgramAddressSync } = require('@project-serum/anchor/dist/cjs/utils/pubkey');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

// Utility functions
const getKeypair = (privateKey) => {
  if (!privateKey) {
    throw new Error('Solana private key is not provided in environment variables');
  }
  return Keypair.fromSecretKey(bs58.decode(privateKey));
};

const programIDL = require('../../programIDL.json');

const programPublicKey = new PublicKey(process.env.PROGRAM_ID);
const tokenMetadataProgramID = new PublicKey(process.env.TOKEN_METADATA_PROGRAM_ID);
const tokenProgramID = new PublicKey(process.env.TOKEN_PROGRAM_ID);
const associatedTokenProgramID = new PublicKey(process.env.ASSOCIATED_TOKEN_PROGRAM_ID);

// Initialize Pinata client
const pinata = new PinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);

// Initialize wallet signer
const walletKeypair = getKeypair(process.env.WALLET_PRIVATE_KEY);
const signer = new Wallet(walletKeypair);

// Initialize Solana connection
const connection = new Connection(process.env.PROGRAM_ID);
const provider = new AnchorProvider(connection, signer, AnchorProvider.defaultOptions());
const program = new Program(programIDL, programPublicKey, provider);
const [programDataPDA] = findProgramAddressSync([Buffer.from('program_data')], programPublicKey);

// Upload file to IPFS using Pinata
const uploadToIPFS = async (fileBuffer, fileName) => {
  try {
    // Convert the buffer to a readable stream
    const stream = Readable.from(fileBuffer);

    const options = {
      pinataMetadata: {
        name: fileName,
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };

    // Pass the stream instead of the buffer
    const result = await pinata.pinFileToIPFS(stream, options);
    return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};

// Mint NFT with document hash
const mintDocumentNFT = async (tokenUri) => {
  try {
    // Create mint account
    const mintKeypair = Keypair.generate();
    console.log('Mint address:', mintKeypair.publicKey.toString());

    // Derive mint authority PDA
    const [mintAuthorityPDA] = findProgramAddressSync(
      [Buffer.from('mint_authority'), mintKeypair.publicKey.toBuffer()],
      programPublicKey
    );

    // Derive metadata account
    const [metadataAddress] = findProgramAddressSync(
      [Buffer.from('metadata'), tokenMetadataProgramID.toBuffer(), mintKeypair.publicKey.toBuffer()],
      tokenMetadataProgramID
    );

    // Get associated token account
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      walletKeypair.publicKey // recipient is the wallet owner
    );

    // Mint NFT - using only parameters defined in IDL
    const tx = await program.methods
      .mintNft(tokenUri)
      .accounts({
        signer: walletKeypair.publicKey,
        trustedForwarder: walletKeypair.publicKey,
        programData: programPublicKey,
        mint: mintKeypair.publicKey,
        tokenAccount: associatedTokenAccount,
        recipient: walletKeypair.publicKey,
        metadata: metadataAddress,
        mintAuthority: mintAuthorityPDA,
        tokenMetadataProgram: tokenMetadataProgramID,
        tokenProgram: tokenProgramID,
        associatedTokenProgram: associatedTokenProgramID,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log('NFT minted with tx:', tx);
    console.log('Mint address:', mintKeypair.publicKey.toString());

    return tx;
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
};

/**
 * Helper function to find mint address from transaction
 */
const findMintAddressFromTransaction = (transaction) => {
  try {
    const { accounts, instructions } = transaction.transaction.message;

    // Find the mint instruction by looking for our program ID
    const mintInstruction = instructions.find((ix) => ix.programId.toString() === programPublicKey.toString());

    if (!mintInstruction) return null;

    // In the IDL, mint account is the 4th account (index 3) in mintNft instruction
    const mintAccountIndex = mintInstruction.accounts[3];
    return accounts[mintAccountIndex].toString();
  } catch (error) {
    console.error('Error parsing transaction:', error);
    return null;
  }
};

const getTransactionData = async (signature) => {
  try {
    // Validate signature
    if (!signature || typeof signature !== 'string') {
      throw new Error('Invalid transaction signature');
    }

    // Get transaction details
    const transaction = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Calculate age metrics
    const currentTime = Math.floor(Date.now() / 1000);
    const blockTime = transaction.blockTime || currentTime;
    const ageInSeconds = currentTime - blockTime;
    const ageInMinutes = Math.floor(ageInSeconds / 60);
    const ageInHours = Math.floor(ageInMinutes / 60);
    const ageInDays = Math.floor(ageInHours / 24);

    // Find mint address from transaction
    const mintAddress = findMintAddressFromTransaction(transaction);

    // Get program data to verify token details
    const programData = await program.account.programData.fetch(programDataPDA);

    return {
      signature,
      mintAddress,
      blockNumber: transaction.slot,
      timestamp: blockTime,
      programId: programPublicKey.toString(),
      programName: programData.name,
      programSymbol: programData.symbol,
      tokenCounter: programData.tokenCounter.toString(),
      ageInSeconds,
      ageInMinutes,
      ageInHours,
      ageInDays,
      logs: (transaction.meta && transaction.meta.logMessages) || [],
    };
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    throw error;
  }
};

module.exports = {
  pinata,
  provider,
  signer,
  contract: program,
  uploadToIPFS,
  mintDocumentNFT,
  getTransactionData,
};
