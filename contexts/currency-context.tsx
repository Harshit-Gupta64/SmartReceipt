"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

type Currency = (typeof CURRENCIES)[number];

type CurrencyContextType = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  format: (amount: number) => string;
  exchangeRate: number;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: CURRENCIES[0],
  setCurrency: () => {},
  format: (amount) => `₹${amount.toFixed(2)}`,
  exchangeRate: 1,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);
  const [exchangeRate, setExchangeRate] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem("preferred_currency");
    if (saved) {
      const found = CURRENCIES.find((c) => c.code === saved);
      if (found) setCurrencyState(found);
    }
  }, []);

  useEffect(() => {
    if (currency.code === "INR") {
      setExchangeRate(1);
      return;
    }

    // Fetch live exchange rate
    fetch(`https://api.exchangerate-api.com/v4/latest/INR`)
      .then((res) => res.json())
      .then((data) => {
        const rate = data.rates[currency.code];
        if (rate) setExchangeRate(rate);
      })
      .catch(() => {
        // Fallback rates if API fails
        const fallback: Record<string, number> = {
          USD: 0.012,
          EUR: 0.011,
          GBP: 0.0095,
          AED: 0.044,
          SGD: 0.016,
        };
        setExchangeRate(fallback[currency.code] || 1);
      });
  }, [currency]);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem("preferred_currency", c.code);
  }

  function format(amount: number) {
    const converted = amount * exchangeRate;
    return `${currency.symbol}${converted.toFixed(2)}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, exchangeRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}