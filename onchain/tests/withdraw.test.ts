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
  stackingDataContractName,
  stackingLogicContractName,
  stackingVaultContractName,
} from "./config";
import { mulBps } from "./utils";

const accounts = simnet.getAccounts();
const deployerAddress = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;

const btcAddress1 = "bc1q0xcqpzrky6eff2g52qdye53xkk9jxkvrh6yhyw";
const pegInScript = btc.Address().decode(btcAddress1);
const pegInOutscript = hex.encode(btc.OutScript.encode(pegInScript));

describe("Withdrawals", () => {
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
      "token-btc",
      "set-approved-contract",
      [
        Cl.contractPrincipal(deployerAddress, stackingVaultContractName),
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
  it("Withdraw with no rewards", () => {
    const pegInAmountSats = 100000n;
    const pegInAmountBtcz = pegInAmountSats * EXTRA_DECIMALS;
    let tx = generatePegInTx(BigInt(pegInAmountSats), pegInOutscript, address1);
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
    ).toBe(pegInAmountBtcz);
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(pegInAmountBtcz),
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

    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
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
      stackingDataContractName,
      "get-withdrawal",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["finalized"].value).toBe(true);
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(0);
  });
  it("Withdraw with a single user", () => {
    const pegInAmountSats = 100000n;
    const pegInAmountBtcz = pegInAmountSats * EXTRA_DECIMALS;
    const rewards = 10000;
    let tx = generatePegInTx(BigInt(pegInAmountSats), pegInOutscript, address1);
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
    ).toBe(pegInAmountBtcz);
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(rewards)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(pegInAmountBtcz),
      ],
      address1
    );
    expect(
      simnet
        .getAssetsMap()
        .get(`.${lstTokenContractName}.${lstTokenName}`)!
        .get(`${address1}`)
    ).toBe(0n);

    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
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
    expect(callResponse.result).toBeErr(Cl.uint(6005));
    // check withdrawal request is deleted
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["finalized"].value).toBe(true);
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(0);
  });
  it("Withdraw with a 2 users and one receives half", () => {
    const pegInAmountSats = 100000n;
    const pegInAmountBtcz = pegInAmountSats * EXTRA_DECIMALS;
    const rewards = 10000;
    let tx = generatePegInTx(BigInt(pegInAmountSats), pegInOutscript, address1);
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
    tx = generatePegInTx(BigInt(pegInAmountSats), pegInOutscript, address2);
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
      [Cl.uint(rewards)],
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
        Cl.uint(pegInAmountBtcz),
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
        Cl.uint(pegInAmountBtcz),
      ],
      address2
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    // console.log(
    //   simnet.getAssetsMap().get(`.${lstTokenContractName}.${lstTokenName}`)!
    // );
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
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
      stackingDataContractName,
      "get-withdrawal",
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
      stackingDataContractName,
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(0);
  });

  it("Withdraw with 2 users, add rewards after, 1st user does not get diluted after 2nd deposit. 2nd user gets the same amount", () => {
    const pegInAmountSats = 100000n;
    const pegInAmountBtcz = pegInAmountSats * EXTRA_DECIMALS;
    const rewards = 10000;
    let tx = generatePegInTx(BigInt(pegInAmountSats), pegInOutscript, address1);
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
      [Cl.uint(rewards)],
      deployerAddress
    );

    tx = generatePegInTx(BigInt(pegInAmountSats), pegInOutscript, address2);
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
        Cl.uint(pegInAmountBtcz),
      ],
      address1
    );
    const btczAmounts2 = simnet
      .getAssetsMap()
      .get(`.${lstTokenContractName}.${lstTokenName}`)!
      .get(address2)!;
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(btczAmounts2),
      ],
      address2
    );
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
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
      stackingDataContractName,
      "get-withdrawal",
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
      stackingDataContractName,
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
    const pegInAmountSats = 100000n;
    const pegInAmountBtcz = pegInAmountSats * EXTRA_DECIMALS;
    const rewards = 10000;
    let tx = generatePegInTx(BigInt(pegInAmountSats), pegInOutscript, address1);
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
    tx = generatePegInTx(BigInt(pegInAmountSats), pegInOutscript, address2);
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
      [Cl.uint(rewards)],
      deployerAddress
    );

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(pegInAmountBtcz),
      ],
      address1
    );
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "105000"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");

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
        Cl.uint(pegInAmountBtcz),
      ],
      address2
    );
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
      [Cl.uint(2)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      "110000"
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe("0");
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");
  });
  it("Withdraw, with peg-out-fees", () => {
    const pegInAmountSats = 100000n;
    const pegInAmountBtcz = pegInAmountSats * EXTRA_DECIMALS;
    const rewards = 10000;
    const pegOutAmount = 100000n;
    // const rewards = 10000n;
    const pegOutFees = 5_000_000_000n;
    const pegOutbps = 500n;
    const pegOutWOFeesSats = BigInt(
      pegOutAmount - mulBps(pegOutAmount, pegOutbps)
    );

    let callResponse = simnet.callPublicFn(
      "peg-data",
      "set-peg-out-fee",
      [Cl.uint(pegOutFees)],
      deployerAddress
    );

    let tx = generatePegInTx(BigInt(pegInAmountSats), pegInOutscript, address1);
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
    ).toBe(pegInAmountBtcz);

    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-redeemable-btc-by-amount",
      [Cl.uint(100000n * EXTRA_DECIMALS)],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(100000);

    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-redeemable-btc-by-amount-after-fees",
      [Cl.uint(100000n * EXTRA_DECIMALS)],
      deployerAddress
    );
    expect(callResponse.result).toBeOk(Cl.uint(99500));

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(pegInAmountBtcz),
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

    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      `${pegOutWOFeesSats}`
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe(
      `${mulBps(pegOutAmount, pegOutbps)}`
    );
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe("0");

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "finalize-withdraw",
      [Cl.uint(1)],
      deployerAddress
    );
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["finalized"].value).toBe(true);
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(0);
  });
  it("Withdraw, with peg-out-gas-fees", () => {
    const pegOutAmount = 100000n;
    const pegInSats = 100000n;
    const pegInAmountBtcz = pegInSats * EXTRA_DECIMALS;
    const pegOutFees = 10000n;
    // const rewards = 10000n;
    const pegOutWOFees = pegOutAmount - pegOutFees;

    let callResponse = simnet.callPublicFn(
      "peg-data",
      "set-peg-out-gas-fee",
      [Cl.uint(pegOutFees)],
      deployerAddress
    );

    let tx = generatePegInTx(BigInt(pegInSats), pegInOutscript, address1);
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
    ).toBe(pegInAmountBtcz);
    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "init-withdraw",
      [
        Cl.bufferFromHex(
          "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        Cl.uint(pegInAmountBtcz),
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

    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["btc-amount"].value).toBe(
      `${pegOutWOFees}`
    );
    expect(cvToValue(callResponse.result).value["fee"].value).toBe(`0`);
    expect(cvToValue(callResponse.result).value["gas-fee"].value).toBe(
      `${pegOutFees}`
    );

    callResponse = simnet.callPublicFn(
      stackingLogicContractName,
      "finalize-withdraw",
      [Cl.uint(1)],
      deployerAddress
    );
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-withdrawal",
      [Cl.uint(1)],
      deployerAddress
    );
    expect(cvToValue(callResponse.result).value["finalized"].value).toBe(true);
    callResponse = simnet.callReadOnlyFn(
      stackingDataContractName,
      "get-total-btc",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(0);
  });
});
