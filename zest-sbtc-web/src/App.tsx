import React, { useState, useEffect } from 'react';
import { showConnect, openContractCall } from '@stacks/connect';
import { StacksTestnet, StacksDevnet } from '@stacks/network';
import { hexToBytes } from '@stacks/common';
import {
  AnchorMode,
  PostConditionMode,
  stringUtf8CV,
  bufferCVFromString,
  tupleCV,
  uintCV,
  listCV,
  bufferCV,
  callReadOnlyFunction,
  cvToValue,
  principalCV,
} from '@stacks/transactions';
import { userSession } from './userSession';
import { AppBar, Tabs, Tab, Typography, Box, TextField, Grid } from '@mui/material';

import './App.css';

const network = new StacksDevnet();
const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
// const network = new StacksTestnet();
// const contractAddress = 'ST3FSKZQ5YKPXYB5PKTYFVW13D732S7N7GNQ1MQJB';

const walletResponse = await (window as any).LeatherProvider?.request("getAddresses");
console.log(walletResponse.result.addresses[2]);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

export function numberToHex(num: number) {
  let s = Number(num).toString(16);
  console.log(s)
  s = s.length % 2 ? "0".concat(s) : s;
  return s;
}

export function padTo(hex: string, length = 4) {
  return hex.padStart(length * 2, "0");
}

export function toLittleEndian(hex: string) {
  let s = "";
  for(let i = 0; i < hex.length; i++) {
    if(i % 2 == 0) {
      s = (hex.slice(i, i+2)).concat(s);
    }
  }
  return s;
}

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  };
}

const QueryFields: React.FC = () => {
  const [field1, setField1] = useState<string>('');
  const [field2, setField2] = useState<string>('');
  const [field3, setField3] = useState<string>('');

  useEffect(() => {
    async function fetchsBtcBalance() {
      const contractName = 'token-abtc';
      const functionName = 'get-balance';
      const senderAddress = walletResponse.result.addresses[2].address;

      const options = {
        contractAddress,
        contractName,
        functionName,
        functionArgs: [
          principalCV(senderAddress)
        ],
        network,
        senderAddress,
      };
      try {
        callReadOnlyFunction(options).then((result) => {
          // console.log(cvToValue(result));
          const sBTCBalance = Number(cvToValue((result as any).value)) / 100_000_000;
          setField1(`sBTC balance: ${sBTCBalance}`);
          
        }).catch((err) => {
          console.log(err);
          setField1(`Error Oops!`);
        })
      } catch (e) {
          console.error(e);
      }
    };
    async function fetchRedeemableBTC() {
      const contractName = 'stacking-btc';
      const functionName = 'get-redeemable-btc';
      // const buffer = bufferCVFromString('foo');
      const senderAddress = walletResponse.result.addresses[2].address;

      const options = {
        contractAddress,
        contractName,
        functionName,
        functionArgs: [
          principalCV(senderAddress)
        ],
        network,
        senderAddress,
      };
      try {
        callReadOnlyFunction(options).then((result) => {
          console.log(cvToValue(result));
          const redeemeableBtcBalance = Number(cvToValue(result as any)) / 100_000_000;
          setField2(`Redeeamable BTC ${redeemeableBtcBalance}`);
          
        }).catch((err) => {
          console.log(err);
          setField1(`Error Oops!`);
        })
      } catch (e) {
          console.error(e);
      }
    };

    const interval = setInterval(() => {
      // Replace these with actual queries
      fetchsBtcBalance();
      fetchRedeemableBTC();
      
      setField3(`Value 3 at ${new Date().toLocaleTimeString()}`);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box mt={2}>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <TextField
            label="Field 1"
            value={field1}
            variant="outlined"
            fullWidth
            margin="normal"
            InputProps={{
              readOnly: true,
            }}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            label="Field 2"
            value={field2}
            variant="outlined"
            fullWidth
            margin="normal"
            InputProps={{
              readOnly: true,
            }}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            label="Field 3"
            value={field3}
            variant="outlined"
            fullWidth
            margin="normal"
            InputProps={{
              readOnly: true,
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

const myAppName = 'My Stacks Web-App';
const myAppIcon = window.location.origin + '/my_logo.png';
// const custodianExampleAddr = "mysp14yWFpyacRFp9YCQSH9LTm2P2pPXJ3";
// const custodianExampleAddr = "bcrt1q3zl64vadtuh3vnsuhdgv6pm93n82ye8q6cr4ch";
// bcrt1q3zl64vadtuh3vnsuhdgv6pm93n82ye8q6cr4ch
const custodianExampleAddr = "mr1iPkD9N3RJZZxXRk7xF9d36gffa6exNC";
const App: React.FC = () => {
  const [inputValue, setInputValue] = useState<number>(0);
  const [tx, setTx] = useState<string>('');
  const [reward, setRewardValue] = useState<number>(0);
  const [tabValue, setTabValue] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [redeemableAmount, setRedeemableAmount] = useState(0);
  const [pegoutAddress, setPegoutAddress] = useState('');
  const [txId, setTxId] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setInputValue(value === '' ? 0 : Number(value));
  };

  const handleDepositChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setTx(event.target.value);
  };

  const handleRewardChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setRewardValue(value === '' ? 0 : Number(value));
  };

  const handlewithdrawAmountChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setWithdrawAmount(value === '' ? 0 : Number(value));

    const contractName = 'stacking-btc';
    const functionName = 'get-redeemable-btc-by-amount';
    const senderAddress = walletResponse.result.addresses[2].address;
    const withdrawnAmount = Number(value) * 100_000_000;

    const options = {
      contractAddress,
      contractName,
      functionName,
      functionArgs: [
        uintCV(withdrawnAmount)
      ],
      network,
      senderAddress,
    };
    try {
      callReadOnlyFunction(options).then((result) => {
        // console.log(cvToValue(result));
        const redeemeableBtcBalance = Number(cvToValue(result)) / 100_000_000;
        setRedeemableAmount(redeemeableBtcBalance);
      }).catch((err) => {
        console.log(err);
      })
    } catch (e) {
        console.error(e);
    }
  };

  const handlePegoutAddressChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setPegoutAddress(event.target.value);
  };

  const handleBitcoinPaymentClick = async (sats: number): Promise<void> => {
    const btcAmount = sats * 100_000_000;
    try {
      // const response = await (window as any).LeatherProvider?.request("sendTransfer", {
      //   recipients: [
      //     {
      //       address: "mxFySYdWBfAoByU2VxKEubZpVVa1f2LHeo",
      //       // address: "bcrt1qs758ursh4q9z627kt3pp5yysm78ddny6txaqgw",
      //       amount: btcAmount,
      //     },
      //   ],
      //   network: "testnet",
      // });
      // console.log(`Deposit txid: ${response.result.txid}`);
      // setTxId(response.result.txid);


    await openContractCall({
      network,
      anchorMode: AnchorMode.Any, // which type of block the tx should be mined in
    
      contractAddress,
      contractName: 'stacking-btc',
      functionName: 'add-rewards',
      functionArgs: [
        uintCV(1)
      ],
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      onFinish: response => {
        // WHEN user confirms pop-up
      },
      onCancel: () => {
        // WHEN user cancels/closes pop-up
      },
    });

      const txid = "14bc6a7cf0985e3a7aad4d5cabc2907ab04d02f3bc11fff3ff4fd11ea6ab4f11";
      setTxId(txid);

      // const valueHex = padTo(numberToHex(btcAmount), 8);
      // "02000000000101cce8782b81f27651c6c72d7670f70e444d1cee04a4a87ebe0afc61916686e79e0600000000fdffffff03a08601000000000022512027c78da89b2c03d8088370af71614049f11303549236d3f1a05b680f47aa4f3fffbc010000000000160014da166c580df1eafcbb4152faa033e7173c6a95f40000000000000000186a16051a7321b74e2b6a7e949e6c4ad313035b166509501702473044022063d68bc905edf6a73b70811cfb3d400ba2bc0e6fc67bedea2ba5a476a9b202860220475185f87f553f812a072bfd7e3f0d51bb9178e20349179eff7188a60c5266ac012102a9794ecf17a4bc0e2df9e83b58f600291018c1d84423d4fb62ae8d1f439fc78600000000"
      // const txHex = `02000000000101cce8782b81f27651c6c72d7670f70e444d1cee04a4a87ebe0afc61916686e79e0600000000fdffffff03${toLittleEndian(valueHex)}22512027c78da89b2c03d8088370af71614049f11303549236d3f1a05b680f47aa4f3fffbc010000000000160014da166c580df1eafcbb4152faa033e7173c6a95f40000000000000000186a16051a7321b74e2b6a7e949e6c4ad313035b166509501702473044022063d68bc905edf6a73b70811cfb3d400ba2bc0e6fc67bedea2ba5a476a9b202860220475185f87f553f812a072bfd7e3f0d51bb9178e20349179eff7188a60c5266ac012102a9794ecf17a4bc0e2df9e83b58f600291018c1d84423d4fb62ae8d1f439fc78600000000`;

    } catch (error: any) {
      console.log(error);
    }
  };

  const handleClick = (buttonName: string): void => {
    alert(`Button ${buttonName} clicked! Input value: ${inputValue}`);
  };

  const handleAddRewardsClick = async (rewards: number): Promise<void> => {
    const btcAmount = rewards * 100_000_000;
    await openContractCall({
      network,
      anchorMode: AnchorMode.Any, // which type of block the tx should be mined in
    
      contractAddress,
      contractName: 'stacking-btc',
      functionName: 'add-rewards',
      functionArgs: [
        uintCV(btcAmount)
      ],
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      onFinish: response => {
        // WHEN user confirms pop-up
      },
      onCancel: () => {
        // WHEN user cancels/closes pop-up
      },
    });
  };

  const handleDeposit = async (txId: string): Promise<void> => {
    const url = `https://mempool.space/testnet/api/tx/${txId}/hex`;
    // const response = await (await fetch(url)).text();
    const response = "02000000000101cce8782b81f27651c6c72d7670f70e444d1cee04a4a87ebe0afc61916686e79e0600000000fdffffff03a08601000000000022512027c78da89b2c03d8088370af71614049f11303549236d3f1a05b680f47aa4f3fffbc010000000000160014da166c580df1eafcbb4152faa033e7173c6a95f40000000000000000186a16051a7321b74e2b6a7e949e6c4ad313035b166509501702473044022063d68bc905edf6a73b70811cfb3d400ba2bc0e6fc67bedea2ba5a476a9b202860220475185f87f553f812a072bfd7e3f0d51bb9178e20349179eff7188a60c5266ac012102a9794ecf17a4bc0e2df9e83b58f600291018c1d84423d4fb62ae8d1f439fc78600000000"

    await openContractCall({
      network,
      anchorMode: AnchorMode.Any, // which type of block the tx should be mined in
    
      contractAddress,
      contractName: 'stacking-btc',
      functionName: 'deposit',
      functionArgs: [
        bufferCV(hexToBytes(response)),
        tupleCV({
          header: bufferCV(hexToBytes("")),
          height: uintCV(0),
        }),
        tupleCV({
          "tx-index": uintCV(0),
          hashes: listCV([]),
          "tree-depth": uintCV(0),
        }),
        uintCV(0),
        uintCV(2),
      ],
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      onFinish: response => {
        // WHEN user confirms pop-up
      },
      onCancel: () => {
        // WHEN user cancels/closes pop-up
      },
    });
    // alert(`Button ${txHex} clicked! Input value: ${inputValue}`);
  };

  const handleWithdrawClick = async (withdrawAmount: number, pegoutAddress: string): Promise<void> => {
    const btcAmount = withdrawAmount * 100_000_000;
    const tempAddr = "8782b81f27651c6c72d7670f70e444d1ce";
    await openContractCall({
      network,
      anchorMode: AnchorMode.Any, // which type of block the tx should be mined in
    
      contractAddress,
      contractName: 'stacking-btc',
      functionName: 'init-withdraw',
      functionArgs: [
        bufferCV(hexToBytes(tempAddr)),
        uintCV(btcAmount),
      ],
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      onFinish: response => {
        // WHEN user confirms pop-up
      },
      onCancel: () => {
        // WHEN user cancels/closes pop-up
      },
    });
  };

  const handleConnectWallet = (): void => {
    showConnect({
      userSession, // `userSession` from previous step, to access storage
      appDetails: {
        name: myAppName,
        icon: myAppIcon,
      },
      onFinish: () => {
        window.location.reload(); // WHEN user confirms pop-up
      },
      onCancel: () => {
        console.log('oops'); // WHEN user cancels/closes pop-up
      },
    });
  };

  return (
    <div className="App">
      <button className="connect-wallet-button" onClick={handleConnectWallet}>
        Connect Wallet
      </button>
      <AppBar position="static">
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="tabs example">
          <Tab
            label="Send Bitcoin"
            {...a11yProps(0)}
            sx={{ color: tabValue === 0 ? 'white' : 'black' }}
          />
          <Tab
            label="Deposit on Stacks"
            {...a11yProps(1)}
            sx={{ color: tabValue === 1 ? 'white' : 'black' }}
          />
          <Tab
            label="Withdraw"
            {...a11yProps(2)}
            sx={{ color: tabValue === 2 ? 'white' : 'black' }}
          />
          <Tab
            label="Add rewards"
            {...a11yProps(3)}
            sx={{ color: tabValue === 3 ? 'white' : 'black' }}
            />
        </Tabs>
      </AppBar>
      <TabPanel value={tabValue} index={0}>
        <input 
            type="number"
            value={inputValue} 
            onChange={handleInputChange} 
            placeholder="Type something..."
        />
        <button onClick={() => handleBitcoinPaymentClick(inputValue)}>Send Bitcoin</button>
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {/* <input
          type="string" 
          value={tx} 
          onChange={handleDepositChange}
          placeholder="Enter Raw transaction HEX"
        /> */}
        <button onClick={() => handleDeposit(txId)}>Deposit</button>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {"sBTC amount: "}
        <input
          type="number" 
          value={withdrawAmount}
          onChange={handlewithdrawAmountChange}
          placeholder="Type something..."
        />
        <br></br>
        {"withdrawal BTC address: "}
        <input
          type="string" 
          value={pegoutAddress}
          onChange={handlePegoutAddressChange}
          placeholder="Enter Raw transaction HEX"
        />
        <br></br>
        <button onClick={() => handleWithdrawClick(withdrawAmount, pegoutAddress)}>Withdraw</button>
        <br></br>

        {"BTC amount to redeem: "}
        <input
          value={redeemableAmount}
          readOnly={true}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <input 
          type="number" 
          value={reward}
          onChange={handleRewardChange} 
          placeholder="Type something..."
        />
        <button onClick={() => handleAddRewardsClick(reward)}>Add Rewards</button>
      </TabPanel>
      <QueryFields />
    </div>
  );
}

export default App;
