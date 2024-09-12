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
  feeDataContractName,
  lstTokenContractName,
  lstTokenName,
  stackingDataContractName,
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

const ONE = 100000000;

describe("Setting params", () => {
  beforeEach(() => {
    let callResponse = simnet.callPublicFn(
      "fee-data",
      "pause-peg-in",
      [Cl.bool(false)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "fee-data",
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
  it("Check set-peg-in-fee and set-peg-out-fee can't be set higher than ONE", () => {
    const fee = 1_000_000;
    // get initial fee
    let callResponse = simnet.callReadOnlyFn(
      feeDataContractName,
      "get-peg-in-fee",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(0);

    // change fee
    callResponse = simnet.callPublicFn(
      feeDataContractName,
      "set-peg-in-fee",
      [Cl.uint(fee)],
      deployerAddress
    );
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify fee was changed
    callResponse = simnet.callReadOnlyFn(
      feeDataContractName,
      "get-peg-in-fee",
      [],
      deployerAddress
    );
    expect(callResponse.result).toBeUint(fee);

    // verify fee can't be set to ONE or (ONE + 1)
    callResponse = simnet.callPublicFn(
      feeDataContractName,
      "set-peg-in-fee",
      [Cl.uint(ONE)],
      deployerAddress
    );
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseErr);
    callResponse = simnet.callPublicFn(
      feeDataContractName,
      "set-peg-in-fee",
      [Cl.uint(ONE + 1)],
      deployerAddress
    );
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseErr);

    // verify fee can't be set to ONE or (ONE + 1)
    callResponse = simnet.callPublicFn(
      feeDataContractName,
      "set-peg-out-fee",
      [Cl.uint(ONE)],
      deployerAddress
    );
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseErr);
    callResponse = simnet.callPublicFn(
      feeDataContractName,
      "set-peg-out-fee",
      [Cl.uint(ONE + 1)],
      deployerAddress
    );
    expect(callResponse.result).toHaveClarityType(ClarityType.ResponseErr);
  });
});
