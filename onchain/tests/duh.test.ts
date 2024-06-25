import { describe, expect, it } from "vitest";
import { Cl, cvToJSON, cvToString, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployerAddress = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;

/*
  The test below is an example. To learn more, read the testing documentation here:
  https://docs.hiro.so/clarinet/feature-guides/test-contract-with-clarinet-sdk
*/

describe("example tests", () => {
  it("shows an example", () => {
    console.log(address1);
    let callResponse = simnet.callPublicFn(
      "bridge-endpoint",
      "pause-peg-in",
      [Cl.bool(false)],
      deployerAddress
    );
    console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callPublicFn(
      "token-abtc",
      "add-approved-contract",
      [Cl.contractPrincipal(deployerAddress, "bridge-endpoint")],
      deployerAddress
    );
    console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callPublicFn(
      "btc-bridge-registry-v1-01",
      "approve-operator",
      [Cl.contractPrincipal(deployerAddress, "bridge-endpoint"), Cl.bool(true)],
      deployerAddress
    );
    console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callPublicFn(
      "btc-bridge-registry-v1-01",
      "approve-peg-in-address",
      [
        Cl.bufferFromHex(
          "512027c78da89b2c03d8088370af71614049f11303549236d3f1a05b680f47aa4f3f"
        ),
        Cl.bool(true),
      ],
      deployerAddress
    );
    console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "deposit",
      [
        Cl.bufferFromHex(
          "02000000000101cce8782b81f27651c6c72d7670f70e444d1cee04a4a87ebe0afc61916686e79e0600000000fdffffff03a08601000000000022512027c78da89b2c03d8088370af71614049f11303549236d3f1a05b680f47aa4f3fffbc010000000000160014da166c580df1eafcbb4152faa033e7173c6a95f40000000000000000186a16051a7321b74e2b6a7e949e6c4ad313035b166509501702473044022063d68bc905edf6a73b70811cfb3d400ba2bc0e6fc67bedea2ba5a476a9b202860220475185f87f553f812a072bfd7e3f0d51bb9178e20349179eff7188a60c5266ac012102a9794ecf17a4bc0e2df9e83b58f600291018c1d84423d4fb62ae8d1f439fc78600000000"
        ),
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
        Cl.uint(2),
      ],
      address1
    );
    console.log(Cl.prettyPrint(callResponse.result));
    console.log(simnet.getAssetsMap());

    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(100_000_000)],
      deployerAddress
    );
    console.log(Cl.prettyPrint(callResponse.result));
  });
});
