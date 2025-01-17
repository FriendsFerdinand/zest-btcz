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
  EXTRA_DECIMALS,
  ONE12,
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
  it("Deposit and mint into standard principal and contract principal", () => {
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

    tx = generatePegInTx(
      BigInt(pegInAmountSats),
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
    ).toBe(pegInAmountSats * EXTRA_DECIMALS);
  });
  it("Deposit to wrong address", () => {
    const wrongOutscript = hex.encode(
      btc.OutScript.encode(
        btc.Address().decode("bc1qtj7um0a0lsf6p7cd0yhlh8lylhsmn5vl8v4fun")
      )
    );
    let tx = generatePegInTx(BigInt(100000), wrongOutscript, address1);
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
    expect(callResponse.result).toBeErr(Cl.uint(6002));
  });
  it("Deposit and account peg in fees", () => {
    const pegInAmount = 100000n;
    const pegInAmountBtcz = pegInAmount * EXTRA_DECIMALS;
    // 0.005
    const pegInFeesPoints = 5000000000n;
    const pegInFeesBps = 500n;
    const pegInAmountWOFees = BigInt(
      pegInAmountBtcz - mulFraction(pegInAmountBtcz, pegInFeesPoints)
    );
    const pegInAmountWOFeesSats = BigInt(
      pegInAmount - mulBps(pegInAmount, pegInFeesBps)
    );
    let callResponse = simnet.callPublicFn(
      "peg-data",
      "set-peg-in-fee",
      [Cl.uint(pegInFeesPoints)],
      deployerAddress
    );
    let tx = generatePegInTx(BigInt(pegInAmount), pegInOutscript, address1);
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
    expect(callResponse.result).toBeUint(pegInAmountWOFeesSats * 2n);
  });
  it("Deposit and account for rewards", () => {
    const pegInAmount = 100000n;
    const pegInAmountBtcz = pegInAmount * EXTRA_DECIMALS;
    const rewards = 10000n;
    let tx = generatePegInTx(BigInt(pegInAmount), pegInOutscript, address1);
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
    expect(callResponse.result).toBeUint(pegInAmount * 2n + rewards);
  });
  it("Deposit to address with a maximum contract name of 54", () => {
    let tx = generatePegInTx(
      BigInt(100000),
      pegInOutscript,
      address1,
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    );
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
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseOk);
  });
});
