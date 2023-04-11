const ZkpContract = artifacts.require('ZkpContract');
const ZkpToken = artifacts.require('ZkpToken');
const ZkpVerifier = artifacts.require("ZkpVerifier");

const chai = require('chai').use(require('chai-as-promised'))
const expect = chai.expect;
const { resolve } = require('path');

const { setup_generic_prover_and_verifier } = require('@noir-lang/barretenberg/dest/client_proofs');
const { compile } = require('@noir-lang/noir_wasm');

contract('ZkpContract', function(accounts) {
    // contracts
    let zkpTokenInstance; // NFTs
    let zkpContractInstance; // Noir verifier

    // accounts
    const hospitalA = accounts[0];
    const hospitalB = accounts[1];

    // ZKP verifier part
    let compiledProgram, acir, prover, verifier;

    before(async() => {
        compiledProgram = compile(resolve(__dirname, '../circuits/src/main.nr'));
        acir = compiledProgram.circuit;
        [prover, verifier] = await setup_generic_prover_and_verifier(acir);
    })

    beforeEach(async() => {
        zkpTokenInstance = await ZkpToken.new();
        zkpVerifierInstance = await ZkpVerifier.new();
        zkpContractInstance = await ZkpContract.new(zkpTokenInstance.address, zkpVerifierInstance.address);
    });

    it("should allow an authorized hospital with a valid ZKP token to add their public key", async() => {
        // Mint a new ZKP token for hospitalA
        await zkpTokenInstance.mint(hospitalA);
        const tokenId = await zkpTokenInstance.userToToken(hospitalA);

        // Set hospitalA's public key
        const name = "Hospital A";
        const publicKey = "0xabc123";
        await zkpContractInstance.setPublicKey(tokenId, name, publicKey, { from: hospitalA })

        // Verify that hospitalA's public key was set correctly
        const retrievedPublicKey = await zkpContractInstance.getPublicKey(tokenId, name, 0);
        assert.equal(retrievedPublicKey, publicKey, "Public key was not set correctly");
    });

    it("should allow an authorized hospital with a valid ZKP token to add new public keys", async() => {
        // Mint a new ZKP token for hospitalA
        await zkpTokenInstance.mint(hospitalA);
        const tokenId = await zkpTokenInstance.userToToken(hospitalA);

        const name = "Hospital A";
        const publicKey1 = "0xaaaaaa";
        const publicKey2 = "0xbbbbbb";
        const publicKey3 = "0xcccccc";
        const publicKey4 = "0xdddddd";

        // Set hospitalA's first public key
        await zkpContractInstance.setPublicKey(tokenId, name, publicKey1, { from: hospitalA })

        // Set hospitalA's second public key
        await zkpContractInstance.setPublicKey(tokenId, name, publicKey2, { from: hospitalA })

        // Set hospitalA's third public key
        await zkpContractInstance.setPublicKey(tokenId, name, publicKey3, { from: hospitalA })

        // Set hospitalA's fourth public key
        await zkpContractInstance.setPublicKey(tokenId, name, publicKey4, { from: hospitalA })

        // Verify that hospitalA's first public keys were set correctly
        const retrievedPublicKey1 = await zkpContractInstance.getPublicKey(tokenId, name, 0);
        assert.equal(retrievedPublicKey1, publicKey1, "Public key 1 was not set correctly");

        const retrievedPublicKey2 = await zkpContractInstance.getPublicKey(tokenId, name, 1);
        assert.equal(retrievedPublicKey2, publicKey2, "Public key 2 was not set correctly");

        const retrievedPublicKey3 = await zkpContractInstance.getPublicKey(tokenId, name, 2);
        assert.equal(retrievedPublicKey3, publicKey3, "Public key 3 was not set correctly");

        const retrievedPublicKey4 = await zkpContractInstance.getPublicKey(tokenId, name, 3);
        assert.equal(retrievedPublicKey4, publicKey4, "Public key 4 was not set correctly");

        // Verify hospitalA's most recent public key
        const retrievedLatestPublicKey = await zkpContractInstance.getLatestPublicKey(tokenId, name);
        assert.equal(retrievedLatestPublicKey, publicKey4, "Latest public key was not set correctly");
    });

    it("should allow an hospital to update their own public key", async() => {
        // Mint a new ZKP token for hospitalA
        await zkpTokenInstance.mint(hospitalA);
        const tokenId = await zkpTokenInstance.userToToken(hospitalA);

        // Set hospitalA's initial public key
        const initialName = "Hospital A";
        const initialPublicKey = "0xabc123";
        await zkpContractInstance.setPublicKey(tokenId, initialName, initialPublicKey, { from: hospitalA });

        // Update hospitalA's public key
        const updatedName = "Hospital A";
        const updatedPublicKey = "0xdef456";
        await zkpContractInstance.setPublicKey(tokenId, updatedName, updatedPublicKey, { from: hospitalA });

        // Verify that hospitalA's public key was updated correctly
        const retrievedPublicKey = await zkpContractInstance.getPublicKey(tokenId, updatedName, 1);
        assert.equal(retrievedPublicKey, updatedPublicKey, "Public key was not updated correctly");
    });

    it("should not allow an unauthorized hospital/user to set a public key", async() => {
        // Mint a new ZKP token for hospitalA
        await zkpTokenInstance.mint(hospitalA);
        const hospitalATokenId = await zkpTokenInstance.userToToken(hospitalA);
        const name = "Hospital A";

        // Try to set a public key for the third account using the second account's ZKP token
        await expect(zkpContractInstance.setPublicKey(hospitalATokenId, name, "0xabc123", { from: hospitalB }))
            .to.be.rejectedWith("VM Exception while processing transaction: revert Caller is not approved or the owner of the corresponding ZKP token");

        // Verify that the public key was not set
        await expect(zkpContractInstance.getLatestPublicKey(hospitalATokenId, name))
            .to.be.rejectedWith("VM Exception while processing transaction: revert Public key does not exist for this token ID and name");
    });

    it("should not allow setting a public key with an empty string", async() => {
        // Mint a new ZKP token for hospitalA
        await zkpTokenInstance.mint(hospitalA);
        const tokenId = await zkpTokenInstance.userToToken(hospitalA);

        // Try to set an empty public key for hospitalA
        const name = "Hospital A";
        await expect(zkpContractInstance.setPublicKey(tokenId, name, "", { from: hospitalA }))
            .to.be.rejectedWith("VM Exception while processing transaction: revert Public key cannot be empty");

        // Verify that the public key was not set
        await expect(zkpContractInstance.getLatestPublicKey(tokenId, name))
            .to.be.rejectedWith("VM Exception while processing transaction: revert Public key does not exist for this token ID and name");
    });

    it("should not allow an authorized hospital to modify another authorized hospital's public key with the same name", async() => {
        // Mint new ZKP tokens for hospitalA and hospitalB
        await zkpTokenInstance.mint(hospitalA);
        await zkpTokenInstance.mint(hospitalB);
        const name = "Hospital A";

        const hospitalATokenId = await zkpTokenInstance.userToToken(hospitalA);
        const hospitalBTokenId = await zkpTokenInstance.userToToken(hospitalB);

        // set public key for Hospital A's token and name "hospital A"
        await zkpContractInstance.setPublicKey(hospitalATokenId, name, "0x123");

        // set public key for Hospital A's token and name "hospital A" by hospitalB
        try {
            await zkpContractInstance.setPublicKey(hospitalBTokenId, name, "0x456", {
                from: hospitalB,
            });
        } catch (error) {
            assert.equal(
                error.reason,
                "You are not the owner of this token",
                "Should not allow an authorized hospital to modify another authorized hospital's public key with the same name"
            );
        }
    });

    it("should allow an authorized hospital to transfer their token and the new address to update their public key", async() => {
        const hospitalANewAddress = accounts[2];

        // Mint a new ZKP token for hospitalA
        await zkpTokenInstance.mint(hospitalA);
        const tokenId = await zkpTokenInstance.userToToken(hospitalA);

        // Set hospitalA's public key
        const name = "Hospital A";
        const publicKey = "0xabc123";
        await zkpContractInstance.setPublicKey(tokenId, name, publicKey, { from: hospitalA });

        // Transfer the token to the new address
        await zkpTokenInstance.transferFrom(hospitalA, hospitalANewAddress, tokenId, { from: hospitalA });

        // Set hospitalA's new public key with the new address
        const newPublicKey = "0xdef456";
        await zkpContractInstance.setPublicKey(tokenId, name, newPublicKey, { from: hospitalANewAddress });

        // Verify that hospitalA's new public key was set correctly
        const retrievedNewPublicKey = await zkpContractInstance.getLatestPublicKey(tokenId, name);
        assert.equal(retrievedNewPublicKey, newPublicKey, "Public key was not set correctly");
    });

    // TODO: update proofs once signature verification works
    // it("should verify a proof — valid proof", async() => {
    //     // valid proof: x != y
    //     const proof = await create_proof(prover, acir, {
    //         x: 1,
    //         y: 2
    //     });

    //     const smartContractResult = await zkpContractInstance.verify(proof);
    //     expect(smartContractResult).eq(true);
    // });

    // it("should verify a proof — invalid proof", async() => {
    //     // invalid proof: x == y
    //     const proof = await create_proof(prover, acir, {
    //         x: 1,
    //         y: 1
    //     });

    //     await expect(zkpContractInstance.verify(proof))
    //         .to.be.rejectedWith("VM Exception while processing transaction: revert Proof failed");
    // });
});