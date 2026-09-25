import {
  BanknoteIcon,
  CreditCardIcon,
  LandmarkIcon,
  LineChartIcon,
  PiggyBankIcon,
  SmartphoneIcon,
  WalletCardsIcon,
  type LucideIcon,
} from "lucide-react";

import type { Enums } from "@/types/database";

export type AccountType = Enums<"account_type">;

export const ACCOUNT_TYPES: Record<AccountType, { label: string; icon: LucideIcon }> = {
  cash: { label: "Efectivo", icon: BanknoteIcon },
  checking: { label: "Cuenta bancaria", icon: LandmarkIcon },
  savings: { label: "Cuenta de ahorro", icon: PiggyBankIcon },
  credit_card: { label: "Tarjeta de crédito", icon: CreditCardIcon },
  debit_card: { label: "Tarjeta de débito", icon: WalletCardsIcon },
  digital_wallet: { label: "Billetera digital", icon: SmartphoneIcon },
  investment: { label: "Inversión", icon: LineChartIcon },
};

export const ACCOUNT_TYPE_VALUES = Object.keys(ACCOUNT_TYPES) as [AccountType, ...AccountType[]];
