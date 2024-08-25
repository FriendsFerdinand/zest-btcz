import { describe, expect, it } from "vitest";
import { Cl, cvToJSON, cvToString, cvToValue } from "@stacks/transactions";
import { generatePegInTx } from "./bitcoin";
import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
import {
  lstTokenContractName,
  lstTokenName,
  stackingLogicContractName,
} from "./config";

const accounts = simnet.getAccounts();
const deployerAddress = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;

const btcAddress1 = "bc1q0xcqpzrky6eff2g52qdye53xkk9jxkvrh6yhyw";
const pegInScript = btc.Address().decode(btcAddress1);
const pegInOutscript = hex.encode(btc.OutScript.encode(pegInScript));

describe("Complete a deposit", () => {
  it("shows an example", () => {
    console.log(address1);
    let callResponse = simnet.callPublicFn(
      "btc-data",
      "pause-peg-in",
      [Cl.bool(false)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "btc-data",
      "pause-peg-out",
      [Cl.bool(false)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "token-btc",
      "add-approved-contract",
      [Cl.contractPrincipal(deployerAddress, stackingLogicContractName)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "btc-bridge-registry-v1-01",
      "approve-operator",
      [
        Cl.contractPrincipal(deployerAddress, stackingLogicContractName),
        Cl.bool(true),
      ],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "stacking-data",
      "approve-operator",
      [
        Cl.contractPrincipal(deployerAddress, stackingLogicContractName),
        Cl.bool(true),
      ],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "stacking-vault",
      "set-approved-contract",
      [
        Cl.contractPrincipal(deployerAddress, stackingLogicContractName),
        Cl.bool(true),
      ],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "token-btc",
      "set-approved-contract",
      [
        Cl.contractPrincipal(deployerAddress, stackingLogicContractName),
        Cl.bool(true),
      ],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "btc-bridge-registry-v1-01",
      "approve-peg-in-address",
      [Cl.bufferFromHex(pegInOutscript), Cl.bool(true)],
      deployerAddress
    );
    console.log(Cl.prettyPrint(callResponse.result));
    let tx = generatePegInTx(BigInt(100000), pegInOutscript, address1);

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "deposit",
      [
        Cl.bufferFromHex(tx),
        Cl.tuple({
          header: Cl.bufferFromHex(""),
          height: Cl.uint(0),
        }),
        Cl.tuple({
          "tx-index": Cl.uint(0),
          hashes: Cl.list([]),
          "tree-depth": Cl.uint(0),
        }),
        Cl.uint(0),
        Cl.uint(1),
      ],
      address1
    );
    expect(
      simnet
        .getAssetsMap()
        .get(`.${lstTokenContractName}.${lstTokenName}`)!
        .get(address1)
    ).toBe(100000n);

    tx = generatePegInTx(
      BigInt(100000),
      pegInOutscript,
      address1,
      "owner-contract"
    );
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "deposit",
      [
        Cl.bufferFromHex(tx),
        Cl.tuple({
          header: Cl.bufferFromHex(""),
          height: Cl.uint(0),
        }),
        Cl.tuple({
          "tx-index": Cl.uint(0),
          hashes: Cl.list([]),
          "tree-depth": Cl.uint(0),
        }),
        Cl.uint(0),
        Cl.uint(1),
      ],
      address1
    );
    console.log(Cl.prettyPrint(callResponse.result));
    expect(
      simnet
        .getAssetsMap()
        .get(`.${lstTokenContractName}.${lstTokenName}`)!
        .get(`${address1}.owner-contract`)
    ).toBe(100000n);
    // tx = generatePegInTx(BigInt(100000), pegInOutscript, address2);

    // callResponse = simnet.callPublicFn(
    //   "stacking-btc",
    //   "deposit",
    //   [
    //     Cl.bufferFromHex(tx),
    //     Cl.tuple({
    //       header: Cl.bufferFromHex(""),
    //       height: Cl.uint(0),
    //     }),
    //     Cl.tuple({
    //       "tx-index": Cl.uint(0),
    //       hashes: Cl.list([]),
    //       "tree-depth": Cl.uint(0),
    //     }),
    //     Cl.uint(0),
    //     Cl.uint(1),
    //   ],
    //   address2
    // );
    // console.log(Cl.prettyPrint(callResponse.result));
    // console.log(simnet.getAssetsMap().get(".token-btc.token-btcz"));
    // callResponse = simnet.callPublicFn(
    //   "stacking-btc",
    //   "add-rewards",
    //   [Cl.uint(10_000)],
    //   deployerAddress
    // );
    // console.log(Cl.prettyPrint(callResponse.result));
    // callResponse = simnet.callReadOnlyFn(
    //   "stacking-btc",
    //   "get-redeemable-btc-by-amount",
    //   [Cl.uint(100_000_000)],
    //   deployerAddress
    // );
    // console.log(Cl.prettyPrint(callResponse.result));
    // callResponse = simnet.callPublicFn(
    //   "stacking-btc",
    //   "init-withdraw",
    //   [Cl.bufferFromHex("00"), Cl.uint(100_000)],
    //   address1
    // );
    // callResponse = simnet.callReadOnlyFn(
    //   "stacking-btc",
    //   "get-withdrawal-by-id",
    //   [Cl.uint(0)],
    //   deployerAddress
    // );
    // callResponse = simnet.callPublicFn(
    //   "stacking-btc",
    //   "withdraw",
    //   [
    //     Cl.uint(0),
    //     Cl.bufferFromHex(""),
    //     Cl.tuple({
    //       header: Cl.bufferFromHex(""),
    //       height: Cl.uint(0),
    //     }),
    //     Cl.tuple({
    //       "tx-index": Cl.uint(0),
    //       hashes: Cl.list([]),
    //       "tree-depth": Cl.uint(0),
    //     }),
    //     Cl.uint(0),
    //     Cl.uint(2),
    //   ],
    //   address1
    // );
    // callResponse = simnet.callReadOnlyFn(
    //   "stacking-btc",
    //   "get-total-btc",
    //   [],
    //   deployerAddress
    // );
    // console.log(simnet.getAssetsMap().get(".token-btc.token-btcz"));
    // console.log(Cl.prettyPrint(callResponse.result));
  });
});
