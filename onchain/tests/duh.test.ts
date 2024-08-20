import { describe, expect, it } from "vitest";
import { Cl, cvToJSON, cvToString, cvToValue } from "@stacks/transactions";
import { generatePegInTx } from "./bitcoin";
import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';

const accounts = simnet.getAccounts();
const deployerAddress = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;

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
    callResponse = simnet.callPublicFn(
      "bridge-endpoint",
      "pause-peg-out",
      [Cl.bool(false)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "token-btc",
      "add-approved-contract",
      [Cl.contractPrincipal(deployerAddress, "bridge-endpoint")],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "token-btc",
      "add-approved-contract",
      [Cl.contractPrincipal(deployerAddress, "stacking-btc")],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "btc-bridge-registry-v1-01",
      "approve-operator",
      [Cl.contractPrincipal(deployerAddress, "bridge-endpoint"), Cl.bool(true)],
      deployerAddress
    );
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
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(10_000)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "init-withdraw",
      [
        Cl.bufferFromHex("00"),
        Cl.uint(100_000)
      ],
      address1
    );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-withdrawal-by-id",
      [
        Cl.uint(0)
      ],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "withdraw",
      [
        Cl.uint(0),
        Cl.bufferFromHex(""),
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
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    console.log(simnet.getAssetsMap().get(".token-btc.token-btcz"));
    console.log(Cl.prettyPrint(callResponse.result));
  });
  it("shows an example", () => {
    let callResponse = simnet.callPublicFn(
      "bridge-endpoint",
      "pause-peg-in",
      [Cl.bool(false)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "bridge-endpoint",
      "pause-peg-out",
      [Cl.bool(false)],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "token-btc",
      "add-approved-contract",
      [Cl.contractPrincipal(deployerAddress, "bridge-endpoint")],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "token-btc",
      "add-approved-contract",
      [Cl.contractPrincipal(deployerAddress, "stacking-btc")],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "btc-bridge-registry-v1-01",
      "approve-operator",
      [Cl.contractPrincipal(deployerAddress, "bridge-endpoint"), Cl.bool(true)],
      deployerAddress
    );
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
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(20_000)],
      deployerAddress
    );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "deposit",
      [
        Cl.bufferFromHex(
          `02000000000101cce8782b81f27651c6c72d7670f70e444d1cee04a4a87ebe0afc61916686e79e0600000000fdffffff03a08601000000000022512027c78da89b2c03d8088370af71614049f11303549236d3f1a05b680f47aa4f3fffbc010000000000160014da166c580df1eafcbb4152faa033e7173c6a95f4000000000000000018${'6a16'}${'051a99e2ec69ac5b6e67b4e26edd0e2c1c1a6b9bbd23'}02473044022063d68bc905edf6a73b70811cfb3d400ba2bc0e6fc67bedea2ba5a476a9b202860220475185f87f553f812a072bfd7e3f0d51bb9178e20349179eff7188a60c5266ac012102a9794ecf17a4bc0e2df9e83b58f600291018c1d84423d4fb62ae8d1f439fc78600000000`
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
      address2
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    // console.log(simnet.getAssetsMap().get(".token-btc.token-btcz"));
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "init-withdraw",
      [
        Cl.bufferFromHex("00"),
        Cl.uint(100_000)
      ],
      address1
    );
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "withdraw",
      [
        Cl.uint(0),
        Cl.bufferFromHex(""),
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
    // console.log('geee');
    // console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "init-withdraw",
      [
        Cl.bufferFromHex("00"),
        Cl.uint(53_333)
      ],
      address2
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "withdraw",
      [
        Cl.uint(1),
        Cl.bufferFromHex(""),
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
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "add-rewards",
      [Cl.uint(10_000)],
      deployerAddress
    );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-redeemable-btc",
      [
        Cl.principal(address1)
      ],
      deployerAddress
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    // console.log(simnet.getAssetsMap().get(".token-btc.token-btcz"));
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "init-withdraw",
      [
        Cl.bufferFromHex("00"),
        Cl.uint(30_000)
      ],
      address2
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    callResponse = simnet.callPublicFn(
      "stacking-btc",
      "withdraw",
      [
        Cl.uint(2),
        Cl.bufferFromHex(""),
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
      address2
    );
    callResponse = simnet.callReadOnlyFn(
      "stacking-btc",
      "get-total-btc",
      [],
      deployerAddress
    );
    // console.log(Cl.prettyPrint(callResponse.result));
    // console.log(simnet.getAssetsMap().get(".token-btc.token-btcz"));
    expect(simnet.getAssetsMap().get(".token-btc.token-btcz")!.get("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stacking-btc")).toBe(BigInt(0));
    expect(simnet.getAssetsMap().get(".token-btc.token-btcz")!.get("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5")).toBe(BigInt(0));
    expect(simnet.getAssetsMap().get(".token-btc.token-btcz")!.get("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")).toBe(BigInt(0));

    const script = btc.Address().decode("bc1q0xcqpzrky6eff2g52qdye53xkk9jxkvrh6yhyw");
    console.log(script);
    const outscript = btc.OutScript.encode(script)
    // console.log(btc.OutScript.encode(script));
    // const string = new TextDecoder().decode(outscript);
    // console.log(string)
    // console.log(btc.Script.encode(btc.OutScript.encode(script)).toString())
    // console.log(hex.encode(outscript));
    
    // const tx = generatePegInTx(BigInt(100000), "0014da166c580df1eafcbb4152faa033e7173c6a95f4", address1);
    const tx = generatePegInTx(BigInt(100000), hex.encode(outscript), address1);
    
    console.log(tx);
  });
});
