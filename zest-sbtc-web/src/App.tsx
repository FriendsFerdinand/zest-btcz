import React, { useState } from 'react';
import { showConnect, openContractCall } from '@stacks/connect';
import { StacksTestnet, StacksDevnet } from '@stacks/network';
import { hexToBytes } from '@stacks/common';
import { AnchorMode, PostConditionMode, stringUtf8CV, bufferCVFromString, tupleCV, uintCV, listCV, bufferCV } from '@stacks/transactions';
import { userSession } from './userSession';

import './App.css';

import { AppBar, Tabs, Tab, Typography, Box } from '@mui/material';

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
  const [pegoutAddress, setPegoutAddress] = useState('');

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
      //       address: "bcrt1qs758ursh4q9z627kt3pp5yysm78ddny6txaqgw",
      //       amount: btcAmount,
      //     },
      //     // {
      //     //   // testnet addres
      //     //   // address: "6a1605169381b04d6167c1b37bfe811f181ede41134b56b9",
      //     //   address: "bcrt1q3zl64vadtuh3vnsuhdgv6pm93n82ye8q6cr4ch",
      //     //   amount: 0,
      //     // },
      //   ],
      //   network: "testnet",
      // });
      const valueHex = padTo(numberToHex(btcAmount), 8);
      // "02000000000101cce8782b81f27651c6c72d7670f70e444d1cee04a4a87ebe0afc61916686e79e0600000000fdffffff03a08601000000000022512027c78da89b2c03d8088370af71614049f11303549236d3f1a05b680f47aa4f3fffbc010000000000160014da166c580df1eafcbb4152faa033e7173c6a95f40000000000000000186a16051a7321b74e2b6a7e949e6c4ad313035b166509501702473044022063d68bc905edf6a73b70811cfb3d400ba2bc0e6fc67bedea2ba5a476a9b202860220475185f87f553f812a072bfd7e3f0d51bb9178e20349179eff7188a60c5266ac012102a9794ecf17a4bc0e2df9e83b58f600291018c1d84423d4fb62ae8d1f439fc78600000000"
      const txHex = `02000000000101cce8782b81f27651c6c72d7670f70e444d1cee04a4a87ebe0afc61916686e79e0600000000fdffffff03${toLittleEndian(valueHex)}22512027c78da89b2c03d8088370af71614049f11303549236d3f1a05b680f47aa4f3fffbc010000000000160014da166c580df1eafcbb4152faa033e7173c6a95f40000000000000000186a16051a7321b74e2b6a7e949e6c4ad313035b166509501702473044022063d68bc905edf6a73b70811cfb3d400ba2bc0e6fc67bedea2ba5a476a9b202860220475185f87f553f812a072bfd7e3f0d51bb9178e20349179eff7188a60c5266ac012102a9794ecf17a4bc0e2df9e83b58f600291018c1d84423d4fb62ae8d1f439fc78600000000`;

      setTx(txHex);
      // console.log(hexToBytes(sats.toString()));
    
      // console.log("Response:", response);
      // console.log("Transaction ID:", response.result.txid);
    } catch (error: any) {
      console.log("Request error:", error.error.code, error.error.message);
    }
  };

  const handleClick = (buttonName: string): void => {
    alert(`Button ${buttonName} clicked! Input value: ${inputValue}`);
  };

  const handleAddRewardsClick = async (rewards: number): Promise<void> => {
    const btcAmount = rewards * 100_000_000;
    await openContractCall({
      network: new StacksDevnet(),
      anchorMode: AnchorMode.Any, // which type of block the tx should be mined in
    
      contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
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

  const handleDeposit = async (txHex: string): Promise<void> => {
    await openContractCall({
      network: new StacksDevnet(),
      anchorMode: AnchorMode.Any, // which type of block the tx should be mined in
    
      contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      contractName: 'stacking-btc',
      functionName: 'deposit',
      functionArgs: [
        bufferCV(hexToBytes(txHex)),
        // bufferCV(),
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
    await openContractCall({
      network: new StacksDevnet(),
      anchorMode: AnchorMode.Any, // which type of block the tx should be mined in
    
      contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      contractName: 'stacking-btc',
      functionName: 'init-withdraw',
      functionArgs: [
        bufferCV(hexToBytes(pegoutAddress)),
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
        <button onClick={() => handleDeposit(tx)}>Deposit</button>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <input
          type="number" 
          value={withdrawAmount}
          onChange={handlewithdrawAmountChange}
          placeholder="Type something..."
        />
        <input
          type="string" 
          value={pegoutAddress}
          onChange={handlePegoutAddressChange}
          placeholder="Enter Raw transaction HEX"
        />
        <button onClick={() => handleWithdrawClick(withdrawAmount, pegoutAddress)}>Withdraw</button>
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
    </div>
  );
}

export default App;
