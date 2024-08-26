import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
import { deepStrictEqual, throws } from "assert";
import * as secp from "@noble/secp256k1";
import {
  contractPrincipalCV,
  cvToHex,
  principalCV,
} from "@stacks/transactions";

const PubKey = hex.decode(
  "030000000000000000000000000000000000000000000000000000000000000001"
);
const privKey = hex.decode(
  "0101010101010101010101010101010101010101010101010101010101010101"
);

export const generateRandomHex = (length: number = 64): string => {
  let result = "";
  const characters = "0123456789abcdef";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const generatePegInTx = (
  pegInAmount: bigint,
  bridgeScriptAddress: string,
  stxAddress: string,
  recipientContractName?: string,
  txid?: string
) => {
  // increase by arbitrary amount for fees
  const amount = (pegInAmount * BigInt(110000)) / BigInt(100000);
  const tx = new btc.Transaction({
    allowUnknownOutputs: true,
  });
  tx.addInput({
    txid: txid ? txid : generateRandomHex(),
    index: 0,
    witnessUtxo: {
      amount,
      script: btc.p2wpkh(secp.getPublicKey(privKey, true)).script,
    },
  });

  tx.addOutput({
    script: bridgeScriptAddress,
    amount: pegInAmount,
  });

  let data = "";
  if (recipientContractName) {
    data = cvToHex(
      contractPrincipalCV(stxAddress, recipientContractName)
    ).slice(2);
  } else {
    data = cvToHex(principalCV(stxAddress)).slice(2);
  }
  const varint =
    data.length / 2 < 76
      ? (data.length / 2).toString(16)
      : `4c${(data.length / 2).toString(16)}`;
  // add data output
  tx.addOutput({
    script: `6a${varint}${data}`,
    amount: BigInt(0),
  });

  tx.sign(privKey);
  tx.finalize();
  return tx.hex;
};
