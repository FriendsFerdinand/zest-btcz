import { describe, expect, it, beforeEach } from "vitest";
import { Cl, cvToJSON, cvToString, cvToValue } from "@stacks/transactions";
import { generatePegInTx } from "./bitcoin";
import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
import {
  lstTokenContractName,
  lstTokenName,
  stackingLogicContractName,
} from "./config";
import { mulBps } from "./utils";

const accounts = simnet.getAccounts();
const deployerAddress = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;

const btcAddress1 = "bc1q0xcqpzrky6eff2g52qdye53xkk9jxkvrh6yhyw";
const pegInScript = btc.Address().decode(btcAddress1);
const pegInOutscript = hex.encode(btc.OutScript.encode(pegInScript));

describe("Complete a deposit", () => {
  beforeEach(() => {
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
  });
  it("Deposit and mint into standard principal and contract principal", () => {
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
    expect(
      simnet
        .getAssetsMap()
        .get(`.${lstTokenContractName}.${lstTokenName}`)!
        .get(`${address1}.owner-contract`)
    ).toBe(100000n);
  });
  it("Deposit and mint into standard principal and contract principal", () => {
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
    expect(
      simnet
        .getAssetsMap()
        .get(`.${lstTokenContractName}.${lstTokenName}`)!
        .get(address1)
    ).toBe(100000n);

    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(10000)],
      deployerAddress
    );
    tx = generatePegInTx(
      BigInt(100000n),
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
    // console.log(
    //   simnet.getAssetsMap().get(`.${lstTokenContractName}.${lstTokenName}`)
    // );
    expect(
      simnet
        .getAssetsMap()
        .get(`.${lstTokenContractName}.${lstTokenName}`)!
        .get(`${address1}.owner-contract`)
    ).toBe(90909n);
  });
  it("Deposit and account peg in fees", () => {
    const pegInAmount = 100000n;
    const pegInAmountWOFees = BigInt(
      pegInAmount - mulBps(pegInAmount, 500_000n)
    );
    let callResponse = simnet.callPublicFn(
      "btc-data",
      "set-peg-in-fee",
      [Cl.uint(500_000n)],
      deployerAddress
    );
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
    ).toBe(pegInAmountWOFees);

    tx = generatePegInTx(BigInt(100000), pegInOutscript, address1);
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
    // total btc should only account the amount sans fees
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(pegInAmountWOFees * 2n);
    // callResponse = simnet.callPublicFn(
    //   "stacking-btc",
    //   "add-rewards",
    //   [Cl.uint(10000)],
    //   deployerAddress
    // );
    // tx = generatePegInTx(
    //   BigInt(100000n),
    //   pegInOutscript,
    //   address1,
    //   "owner-contract"
    // );
    // callResponse = simnet.callPublicFn(
    //   stackingLogicContractName,
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
    //   address1
    // );
    // console.log(
    //   simnet.getAssetsMap().get(`.${lstTokenContractName}.${lstTokenName}`)
    // );
    // expect(
    //   simnet
    //     .getAssetsMap()
    //     .get(`.${lstTokenContractName}.${lstTokenName}`)!
    //     .get(`${address1}.owner-contract`)
    // ).toBe(90000n);
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
  it("Deposit and account for commission", () => {
    const pegInAmount = 100000n;
    const rewards = 10000n;
    const commissionWOFees = BigInt(rewards - mulBps(rewards, 500_000n));
    let callResponse = simnet.callPublicFn(
      "stacking-data",
      "set-commission",
      [Cl.uint(500_000n)],
      deployerAddress
    );
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
    ).toBe(pegInAmount);

    tx = generatePegInTx(BigInt(pegInAmount), pegInOutscript, address1);
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
    // total btc should only account the amount sans fees
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(pegInAmount * 2n);
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(rewards)],
      deployerAddress
    );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(pegInAmount * 2n + commissionWOFees);
  });
});
