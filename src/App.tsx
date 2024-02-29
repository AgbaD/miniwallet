import { Match, Switch, createSignal } from "solid-js";
import {
  HDNodeWallet,
  Wallet,
  JsonRpcProvider,
  formatEther,
  parseEther,
} from "ethers";
import CryptoJS from "crypto-js";
import "./App.css";

function App() {
  const [step, setStep] = createSignal(1);
  const [password, setPassword] = createSignal("");
  const [phrase, setPhrase] = createSignal<string | undefined>("");
  const [recoveryPhrase, setRecoveryPhrase] = createSignal("")
  const [wallet, setWallet] = createSignal<Wallet | HDNodeWallet | null>(null);

  const [balance, setBalance] = createSignal("0");
  const [recipientAddress, setRecipientAddress] = createSignal("");
  const [amount, setAmount] = createSignal("0");
  const [etherscanLink, setEtherscanLink] = createSignal("");

  // const providerUrl = import.meta.env.PROVIDER_URL;
  const provider = new JsonRpcProvider("https://goerli.infura.io/v3/3f530dc71e2e471a9e87f57f1b658d10");
  const key = localStorage.getItem("encryptedPrivateKey");

  const createWallet = () => {
    const mnemonic = Wallet.createRandom().mnemonic;
    setPhrase(mnemonic?.phrase);

    const wallet = HDNodeWallet.fromMnemonic(mnemonic!);
    wallet.connect(provider);
    setWallet(wallet);

    encryptAndStorePrivateKey();
    setStep(2);
  };

  const recoverWallet = async () => {
    const pk = Wallet.fromPhrase(recoveryPhrase()).privateKey;
    const wallet = new Wallet(pk, provider);
    setWallet(wallet);

    encryptAndStorePrivateKey();

    const balance = await wallet?.provider?.getBalance(wallet.address);
    setBalance(formatEther(balance!));

    setStep(3);
  };

  const loadWallet = async () => {
    const bytes = CryptoJS.AES.decrypt(key!, password());
    const privateKey = bytes.toString(CryptoJS.enc.Utf8);

    const wallet = new Wallet(privateKey, provider);
    setWallet(wallet);

    const balance = await wallet?.provider?.getBalance(wallet.address);
    setBalance(formatEther(balance!));
    setStep(3);
  };

  const encryptAndStorePrivateKey = () => {
    const encryptedPrivateKey = CryptoJS.AES.encrypt(
      wallet()!.privateKey,
      password()
    ).toString();

    localStorage.setItem("encryptedPrivateKey", encryptedPrivateKey);
  };

  const transfer = async () => {
    try {
      const transaction = await wallet()?.sendTransaction({
        to: recipientAddress(),
        value: parseEther(amount()),
      });

      setEtherscanLink(`https://sepolia.etherscan.io/tx/${transaction?.hash}`);
    } catch (error) {
      console.error("Transaction error:", error);
    }
  };

  return (
    <div>
      <h1>Ethereum Wallet App</h1>

      <Switch>
        <Match when={step() === 1}>
          <input
            type="password"
            placeholder="Enter password"
            value={password()}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={() => (key ? loadWallet() : createWallet())}>
            {key ? "Load Wallet" : "Create Wallet"}
          </button>
          <button onClick={() => setStep(4)}>Recover Wallet</button>
        </Match>

        <Match when={step() === 2}>
          <p>Save the following prhase in a secure location</p>
          <div>{phrase()}</div>
          <button onClick={() => setStep(3)}>Done</button>
        </Match>

        <Match when={step() === 3}>
          <p>Wallet Address: {wallet()?.address}</p>
          <p>Balance: {balance()}</p>

          <p>Transfer to</p>

          <div>
            <input
              placeholder="Recipient Address"
              value={recipientAddress()}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />

            <input
              placeholder="Amount"
              value={amount()}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {etherscanLink() && (
            <a href={etherscanLink()} target="_blank">
              View on Etherscan
            </a>
          )}
          <button onClick={transfer}>Transfer</button>
        </Match>

        <Match when={step() === 4}>
          <p>Enter your phrase to recover your wallet</p>
          <input
              placeholder="Phrase"
              value={recoveryPhrase()}
              onChange={(e) => setRecoveryPhrase(e.target.value)}
            />
          <input
              placeholder="Password"
              type="password"
              value={password()}
              onChange={(e) => setPassword(e.target.value)}
            />
          <button onClick={recoverWallet}>Recover</button>

        </Match>
      </Switch>
    </div>
  );
}

export default App;
