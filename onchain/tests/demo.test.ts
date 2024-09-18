import { describe, expect, it, beforeEach } from "vitest";
import {
  Cl,
  ClarityType,
  cvToJSON,
  cvToString,
  cvToValue,
} from "@stacks/transactions";
import { generatePegInTx } from "./bitcoin";
import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
import {
  EXTRA_DECIMALS,
  lstTokenContractName,
  lstTokenName,
  stackingLogicContractName,
} from "./config";
import { mulBps, mulFraction } from "./utils";

const accounts = simnet.getAccounts();
const deployerAddress = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;

const btcAddress1 = "bc1q0xcqpzrky6eff2g52qdye53xkk9jxkvrh6yhyw";
const pegInScript = btc.Address().decode(btcAddress1);
const pegInOutscript = hex.encode(btc.OutScript.encode(pegInScript));

describe("Deposits", () => {
  beforeEach(() => {
    let callResponse = simnet.callPublicFn(
      "peg-data",
      "pause-peg-in",
      [Cl.bool(false)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "peg-data",
      "pause-peg-out",
      [Cl.bool(false)],
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
      "btc-registry",
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
      "token-btc",
      "set-approved-contract",
      [
        Cl.contractPrincipal(deployerAddress, stackingLogicContractName),
        Cl.bool(true),
      ],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "btc-registry",
      "approve-peg-in-address",
      [Cl.bufferFromHex(pegInOutscript), Cl.bool(true)],
      deployerAddress
    );
  });
  it("Deposit and check for rounding errors", () => {
    const pegInAmount = 100000n;
    const rewards = 1000n;
    const one_btc = 100_000_000n;
    let tx = generatePegInTx(BigInt(100000), pegInOutscript, address1);
    let callResponse = simnet.callPublicFn(
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
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(1000)],
      deployerAddress
    );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-btc-to-btcz-ratio",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(101_000_000);
    console.log(Cl.prettyPrint(callResponse.result));
    tx = generatePegInTx(BigInt(10000), pegInOutscript, address1);
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
    // console.log(Cl.prettyPrint(callResponse.result));
    // const btczBalance = simnet
    //   .getAssetsMap()
    //   .get(`.${lstTokenContractName}.${lstTokenName}`)!
    //   .get(address1)!;

    // claiming 1 BTCz, how much BTC do i get
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-redeemable-btc-by-amount",
      [Cl.uint(100_000_000)],
      deployerAddress
    );
    console.log(Cl.prettyPrint(callResponse.result));
    expect(callResponse.result).toBeUint(101000000);
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-btc-to-btcz-ratio",
      [],
      deployerAddress
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    // expect(callResponse.result).toBeUint(101000000);
  });
});
