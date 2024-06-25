import React, { useState } from 'react';
import { showConnect } from '@stacks/connect';
import { userSession } from './userSession';
import './App.css';

const myAppName = 'My Stacks Web-App';
const myAppIcon = window.location.origin + '/my_logo.png';
const custodianExampleAddr = "mysp14yWFpyacRFp9YCQSH9LTm2P2pPXJ3";

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState<number>(0);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setInputValue(value === '' ? 0 : Number(value));
  };

  const handleBitcoinPaymentClick = async (sats: number): Promise<void> => {
    const btcAmount = sats * 100_000_000;
    try {
      const response = await (window as any).LeatherProvider?.request("sendTransfer", {
        recipients: [
          {
            address: custodianExampleAddr,
            amount: btcAmount,
          },
          {
            address: "6a1605169381b04d6167c1b37bfe811f181ede41134b56b9",
            amount: 0,
          },
        ],
        network: "testnet",
      });
    
      console.log("Response:", response);
      console.log("Transaction ID:", response.result.txid);
    } catch (error: any) {
      console.log("Request error:", error.error.code, error.error.message);
    }
  };

  const handleClick = (buttonName: string): void => {
    alert(`Button ${buttonName} clicked! Input value: ${inputValue}`);
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
      <header className="App-header">
        <button className="connect-wallet-button" onClick={handleConnectWallet}>
          Connect Wallet
        </button>
        <h1>Welcome to My React App</h1>
        <input 
          type="number" 
          value={inputValue} 
          onChange={handleInputChange} 
          placeholder="Type something..."
        />
        <button onClick={() => handleBitcoinPaymentClick(inputValue)}>Button One</button>
        <button onClick={() => handleClick('Two')}>Button Two</button>
        <button onClick={() => handleClick('Three')}>Button Three</button>
      </header>
    </div>
  );
}

export default App;
