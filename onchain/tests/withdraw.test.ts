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
  lstTokenContractName,
  lstTokenName,
  stackingLogicContractName,
  stackingVaultContractName,
} from "./config";

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
      "token-btc",
      "set-approved-contract",
      [
        Cl.contractPrincipal(deployerAddress, stackingVaultContractName),
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
  it("Withdraw with not rewards", () => {
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
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(100000),
      ],
      address1
    );

    // console.log(Cl.prettyPrint(callResponse.result));
    expect(
      simnet
        .getAssetsMap()
        .get(`.${lstTokenContractName}.${lstTokenName}`)!
        .get(`${address1}`)
    ).toBe(0n);
    // expect(
    //   simnet
    //     .getAssetsMap()
    //     .get(`.${lstTokenContractName}.${lstTokenName}`)!
    //     .get(`${deployerAddress}.${stackingVaultContractName}`)
    // ).toBe(100000n);

    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "100000"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "finalize-withdraw",
      [Cl.uint(1)],
      deployerAddress
    );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["finalized"].value).toBe(true);
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(0);
  });
  it("Withdraw with a single user", () => {
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
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(100000),
      ],
      address1
    );
    expect(
      simnet
        .getAssetsMap()
        .get(`.${lstTokenContractName}.${lstTokenName}`)!
        .get(`${address1}`)
    ).toBe(0n);
    // expect(
    //   simnet
    //     .getAssetsMap()
    //     .get(`.${lstTokenContractName}.${lstTokenName}`)!
    //     .get(`${deployerAddress}.${stackingVaultContractName}`)
    // ).toBe(100000n);

    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "110000"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "finalize-withdraw",
      [Cl.uint(1)],
      deployerAddress
    );
    // testing that we can't withdraw twice
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "finalize-withdraw",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(callResponse.result).toBeErr(Cl.uint(1005));
    // check withdrawal request is deleted
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(1)],
      deployerAddress
    );
    // expect(callResponse.result).toBeErr(Cl.uint(1002));
    expect(cvToValue(callResponse.result).value["finalized"].value).toBe(true);
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(0);
    // console.log(Cl.prettyPrint(callResponse.result));
    // console.log(
    //   simnet.getAssetsMap().get(`.${lstTokenContractName}.${lstTokenName}`)
    // );
  });
  it("Withdraw with a 2 users and one receives half", () => {
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
    tx = generatePegInTx(BigInt(100000), pegInOutscript, address2);
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

    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(10000)],
      deployerAddress
    );

    // console.log(
    //   simnet.getAssetsMap().get(`.${lstTokenContractName}.${lstTokenName}`)!
    // );

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(100000),
      ],
      address1
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(100000),
      ],
      address2
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    // console.log(
    //   simnet.getAssetsMap().get(`.${lstTokenContractName}.${lstTokenName}`)!
    // );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "105000"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");
    // check second withdrawal
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(2)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "105000"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "finalize-withdraw",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseOk);
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "finalize-withdraw",
      [Cl.uint(2)],
      deployerAddress
    );
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseOk);
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(0);
    // expect(
    //   simnet
    //     .getAssetsMap()
    //     .get(`.${lstTokenContractName}.${lstTokenName}`)!
    //     .get(`${deployerAddress}.${stackingVaultContractName}`)
    // ).toBe(0n);
  });

  it("Withdraw with 2 users, add rewards after, 1st user does not get diluted after 2nd deposit. 2nd user gets the same amount", () => {
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
      [Cl.uint(10000)],
      deployerAddress
    );

    tx = generatePegInTx(BigInt(100000), pegInOutscript, address2);
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
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(100000),
      ],
      address1
    );
    // console.log(
    //   simnet.getAssetsMap().get(`.${lstTokenContractName}.${lstTokenName}`)!
    // );
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(90909),
      ],
      address2
    );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "110000"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");
    // check second withdrawal
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(2)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "99999"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "finalize-withdraw",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseOk);
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "finalize-withdraw",
      [Cl.uint(2)],
      deployerAddress
    );
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseOk);
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(1);
    // expect(
    //   simnet
    //     .getAssetsMap()
    //     .get(`.${lstTokenContractName}.${lstTokenName}`)!
    //     .get(`${deployerAddress}.${stackingVaultContractName}`)
    // ).toBe(0n);
  });
  it("A user withdraws their share, withdraws, the other user gets all the rewards.", () => {
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
    tx = generatePegInTx(BigInt(100000), pegInOutscript, address2);
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

    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(10000)],
      deployerAddress
    );

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(100000),
      ],
      address1
    );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "105000"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");

    // console.log(
    //   simnet.getAssetsMap().get(`.${lstTokenContractName}.${lstTokenName}`)!
    // );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-redeemable-btc-by-amount",
      [Cl.uint(100000)],
      deployerAddress
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    // check second withdrawal
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(5000)],
      deployerAddress
    );

    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-redeemable-btc-by-amount",
      [Cl.uint(100000)],
      deployerAddress
    );
    // console.log(Cl.prettyPrint(callResponse.result));

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(100000),
      ],
      address2
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    // console.log(
    //   simnet.getAssetsMap().get(`.${lstTokenContractName}.${lstTokenName}`)!
    // );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-or-fail",
      [Cl.uint(2)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "110000"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");
    // callResponse = simnet.callPublicFn(
    //   stackingLogicContractName,
    //   "finalize-withdraw",
    //   [Cl.uint(1)],
    //   deployerAddress
    // );
    // expect(callResponse.result).toHaveClarityType(ClarityType.ResponseOk);
    // callResponse = simnet.callReadOnlyFn(
    //   "stacking-btc",
    //   "get-total-btc",
    //   [],
    //   deployerAddress
    // );
    // expect(callResponse.result).toBeUint(0);
    // expect(
    //   simnet
    //     .getAssetsMap()
    //     .get(`.${lstTokenContractName}.${lstTokenName}`)!
    //     .get(`${deployerAddress}.${stackingVaultContractName}`)
    // ).toBe(0n);
  });
});
