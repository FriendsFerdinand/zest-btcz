import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';
import { deepStrictEqual, throws } from 'assert';
import * as secp from '@noble/secp256k1';
import { cvToHex, principalCV } from '@stacks/transactions';

const PubKey = hex.decode('030000000000000000000000000000000000000000000000000000000000000001');
const privKey = hex.decode('0101010101010101010101010101010101010101010101010101010101010101');

export const generatePegInTx = (pegInAmount: bigint, scriptAddress: string, stxAddress: string) => {
    // increase by arbitrary amount for fees
    const amount = (pegInAmount * BigInt(110000)) / BigInt(100000);
    const tx = new btc.Transaction({
        allowUnknownOutputs: true,
    });
    tx.addInput({
        txid: "0000000000000000000000000000000000000000000000000000000000000000",
        index: 0,
        witnessUtxo: {
            amount,
            script: btc.p2wpkh(secp.getPublicKey(privKey, true)).script,
        }
    });

    tx.addOutput(
        // "bc1q0xcqpzrky6eff2g52qdye53xkk9jxkvrh6yhyw",
        {
            script: scriptAddress,
            amount: pegInAmount
        }
    );

    const data = `${cvToHex(principalCV(stxAddress)).slice(2)}`;
    // add data output
    tx.addOutput(
        {
            script: `6a16${data}`,
            amount: BigInt(0),
        }
    );

    tx.sign(privKey);
    tx.finalize();
    return tx.hex;
}

// deepStrictEqual(btc.p2wsh(btc.p2pkh(PubKey)), {
//   type: 'wsh',
//   address: 'bc1qhxtthndg70cthfasy8y4qlk9h7r3006azn9md0fad5dg9hh76nkqaufnuz',
//   script: hex.decode('0020b996bbcda8f3f0bba7b021c9507ec5bf8717bf5d14cbb6bd3d6d1a82defed4ec'),
//   witnessScript: hex.decode('76a914168b992bcfc44050310b3a94bd0771136d0b28d188ac'),
// });
