import { Tx, Chain, Account, types } from 'https://deno.land/x/clarinet/index.ts';
import { qualifiedName } from './tests-utils.ts';

// ---------------------------------------------------------
// stSTX token
// ---------------------------------------------------------

class StStxToken {
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account) {
    this.chain = chain;
    this.deployer = deployer;
  }

  getTotalSupply() {
    return this.chain.callReadOnlyFn("ststx-token", "get-total-supply", [], this.deployer.address);
  }

  getName() {
    return this.chain.callReadOnlyFn("ststx-token", "get-name", [], this.deployer.address);
  }

  getSymbol() {
    return this.chain.callReadOnlyFn("ststx-token", "get-symbol", [], this.deployer.address);
  }

  getDecimals() {
    return this.chain.callReadOnlyFn("ststx-token", "get-decimals", [], this.deployer.address);
  }

  getBalance(account: string) {
    return this.chain.callReadOnlyFn("ststx-token", "get-balance", [
      types.principal(account)
    ], this.deployer.address);
  }

  getTokenUri() {
    return this.chain.callReadOnlyFn("ststx-token", "get-token-uri", [], this.deployer.address);
  }

  transfer(caller: Account, amount: number, receiver: string) {
    let block = this.chain.mineBlock([
      Tx.contractCall("ststx-token", "transfer", [
        types.uint(amount * 1000000),
        types.principal(caller.address),
        types.principal(receiver),
        types.none()
      ], caller.address)
    ]);
    return block.receipts[0].result;
  }

  setTokenUri(caller: Account, uri: string) {
    let block = this.chain.mineBlock([
      Tx.contractCall("ststx-token", "set-token-uri", [
        types.utf8(uri),
      ], caller.address)
    ]);
    return block.receipts[0].result;
  }

  mintForProtocol(caller: Account, amount: number, receiver: string) {
    let block = this.chain.mineBlock([
      Tx.contractCall("ststx-token", "mint-for-protocol", [
        types.uint(amount * 1000000),
        types.principal(receiver),
      ], caller.address)
    ]);
    return block.receipts[0].result;
  }

  burnForProtocol(caller: Account, amount: number, receiver: string) {
    let block = this.chain.mineBlock([
      Tx.contractCall("ststx-token", "burn-for-protocol", [
        types.uint(amount * 1000000),
        types.principal(receiver),
      ], caller.address)
    ]);
    return block.receipts[0].result;
  }

  burn(caller: Account, amount: number) {
    let block = this.chain.mineBlock([
      Tx.contractCall("ststx-token", "burn", [
        types.uint(amount * 1000000),
      ], caller.address)
    ]);
    return block.receipts[0].result;
  }

}
export { StStxToken };
