export interface Merchant {
  id: string;
  name: string;
  domain: string;
  description: string;
  icon: string;
  category: string;
}

export const merchants: Merchant[] = [
  {
    id: "bitcoin-magazine",
    name: "Bitcoin Magazine",
    domain: "store.bitcoinmagazine.com",
    description: "Official Bitcoin Magazine merch",
    icon: "currency_bitcoin",
    category: "Bitcoin",
  },
  {
    id: "blockstream",
    name: "Blockstream",
    domain: "store.blockstream.com",
    description: "Jade hardware wallets & gear",
    icon: "memory",
    category: "Hardware",
  },
  {
    id: "ridge-wallet",
    name: "Ridge Wallet",
    domain: "ridgewallet.com",
    description: "Slim wallets & EDC gear",
    icon: "wallet",
    category: "EDC",
  },
  {
    id: "death-wish-coffee",
    name: "Death Wish Coffee",
    domain: "deathwishcoffee.com",
    description: "World's strongest coffee",
    icon: "local_cafe",
    category: "Coffee",
  },
  {
    id: "gymshark",
    name: "Gymshark",
    domain: "gymshark.com",
    description: "Fitness apparel & accessories",
    icon: "fitness_center",
    category: "Fitness",
  },
];

export function getMerchantByDomain(domain: string): Merchant | undefined {
  return merchants.find((m) => m.domain === domain);
}

export const defaultMerchant = merchants[0];
