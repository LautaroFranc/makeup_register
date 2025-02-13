"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CurrencyInputProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: (value: number) => void;
  placeholder?: string;
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder = "Ingresa un precio",
}) => {
  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, ""); // Solo números
    const numericValue = parseFloat(rawValue) / 100; // Dividir por 100 para manejar centavos

    onChange(numericValue); // Actualizar el valor real
  };
  const handleInputBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, ""); // Solo números
    const numericValue = parseFloat(rawValue) / 100; // Dividir por 100 para manejar centavos

    onBlur && onBlur(numericValue);
  };
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Input
        type="text"
        value={formatCurrency(value)}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={placeholder}
      />
    </div>
  );
};
