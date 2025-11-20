"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageCircle, Instagram, Facebook, Send, CreditCard, Building2 } from "lucide-react";

interface PaymentMethods {
  directSale: {
    enabled: boolean;
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    telegram?: string;
  };
  mercadoPago?: {
    enabled: boolean;
    publicKey?: string;
    accessToken?: string;
  };
  bankTransfer?: {
    enabled: boolean;
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    accountType?: string;
    cbu?: string;
    alias?: string;
  };
}

interface PaymentMethodsConfigProps {
  paymentMethods: PaymentMethods;
  onPaymentMethodsChange: (methods: PaymentMethods) => void;
}

export const PaymentMethodsConfig: React.FC<PaymentMethodsConfigProps> = ({
  paymentMethods,
  onPaymentMethodsChange,
}) => {
  const updateDirectSale = (field: string, value: any) => {
    onPaymentMethodsChange({
      ...paymentMethods,
      directSale: {
        ...paymentMethods.directSale,
        [field]: value,
      },
    });
  };

  const updateMercadoPago = (field: string, value: any) => {
    onPaymentMethodsChange({
      ...paymentMethods,
      mercadoPago: {
        enabled: false,
        publicKey: "",
        accessToken: "",
        ...paymentMethods.mercadoPago,
        [field]: value,
      },
    });
  };

  const updateBankTransfer = (field: string, value: any) => {
    onPaymentMethodsChange({
      ...paymentMethods,
      bankTransfer: {
        enabled: false,
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        accountType: "",
        cbu: "",
        alias: "",
        ...paymentMethods.bankTransfer,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Métodos de Pago</h3>
        <p className="text-sm text-gray-600">
          Configura cómo los clientes pueden realizar compras en tu tienda
        </p>
      </div>

      {/* Venta Directa a Redes Sociales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Venta Directa / Redes Sociales
              </CardTitle>
              <CardDescription>
                Los clientes te contactan directamente por WhatsApp u otras redes
              </CardDescription>
            </div>
            <Switch
              checked={paymentMethods.directSale.enabled}
              onCheckedChange={(checked) =>
                updateDirectSale("enabled", checked)
              }
            />
          </div>
        </CardHeader>

        {paymentMethods.directSale.enabled && (
          <CardContent className="space-y-4">
            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                value={paymentMethods.directSale.whatsapp || ""}
                onChange={(e) => updateDirectSale("whatsapp", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Incluye código de país (ej: +54 9 11...)
              </p>
            </div>

            {/* Instagram */}
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-600" />
                Instagram
              </Label>
              <Input
                id="instagram"
                type="text"
                placeholder="@tutienda"
                value={paymentMethods.directSale.instagram || ""}
                onChange={(e) => updateDirectSale("instagram", e.target.value)}
              />
            </div>

            {/* Facebook */}
            <div className="space-y-2">
              <Label htmlFor="facebook" className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-600" />
                Facebook
              </Label>
              <Input
                id="facebook"
                type="text"
                placeholder="facebook.com/tutienda"
                value={paymentMethods.directSale.facebook || ""}
                onChange={(e) => updateDirectSale("facebook", e.target.value)}
              />
            </div>

            {/* Telegram */}
            <div className="space-y-2">
              <Label htmlFor="telegram" className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-500" />
                Telegram
              </Label>
              <Input
                id="telegram"
                type="text"
                placeholder="@tutienda"
                value={paymentMethods.directSale.telegram || ""}
                onChange={(e) => updateDirectSale("telegram", e.target.value)}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* MercadoPago */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                MercadoPago
              </CardTitle>
              <CardDescription>
                Acepta pagos con tarjeta de crédito, débito y más
              </CardDescription>
            </div>
            <Switch
              checked={paymentMethods.mercadoPago?.enabled || false}
              onCheckedChange={(checked) =>
                updateMercadoPago("enabled", checked)
              }
            />
          </div>
        </CardHeader>

        {paymentMethods.mercadoPago?.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mp-publicKey">Public Key</Label>
              <Input
                id="mp-publicKey"
                type="text"
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={paymentMethods.mercadoPago?.publicKey || ""}
                onChange={(e) => updateMercadoPago("publicKey", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mp-accessToken">Access Token</Label>
              <Input
                id="mp-accessToken"
                type="password"
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={paymentMethods.mercadoPago?.accessToken || ""}
                onChange={(e) =>
                  updateMercadoPago("accessToken", e.target.value)
                }
              />
              <p className="text-xs text-gray-500">
                Obtén tus credenciales en{" "}
                <a
                  href="https://www.mercadopago.com.ar/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  MercadoPago Developers
                </a>
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Transferencia Bancaria */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Transferencia Bancaria
              </CardTitle>
              <CardDescription>
                Los clientes pueden transferir directamente a tu cuenta bancaria
              </CardDescription>
            </div>
            <Switch
              checked={paymentMethods.bankTransfer?.enabled || false}
              onCheckedChange={(checked) =>
                updateBankTransfer("enabled", checked)
              }
            />
          </div>
        </CardHeader>

        {paymentMethods.bankTransfer?.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Banco</Label>
              <Input
                id="bankName"
                type="text"
                placeholder="Banco Galicia, Santander, etc."
                value={paymentMethods.bankTransfer?.bankName || ""}
                onChange={(e) => updateBankTransfer("bankName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountHolder">Titular de la Cuenta</Label>
              <Input
                id="accountHolder"
                type="text"
                placeholder="Juan Pérez"
                value={paymentMethods.bankTransfer?.accountHolder || ""}
                onChange={(e) =>
                  updateBankTransfer("accountHolder", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountType">Tipo de Cuenta</Label>
              <select
                id="accountType"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentMethods.bankTransfer?.accountType || ""}
                onChange={(e) =>
                  updateBankTransfer("accountType", e.target.value)
                }
              >
                <option value="">Seleccionar...</option>
                <option value="ahorros">Caja de Ahorros</option>
                <option value="corriente">Cuenta Corriente</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Número de Cuenta</Label>
              <Input
                id="accountNumber"
                type="text"
                placeholder="1234567890"
                value={paymentMethods.bankTransfer?.accountNumber || ""}
                onChange={(e) =>
                  updateBankTransfer("accountNumber", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cbu">CBU</Label>
              <Input
                id="cbu"
                type="text"
                placeholder="0000000000000000000000"
                maxLength={22}
                value={paymentMethods.bankTransfer?.cbu || ""}
                onChange={(e) => updateBankTransfer("cbu", e.target.value)}
              />
              <p className="text-xs text-gray-500">22 dígitos</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alias">Alias</Label>
              <Input
                id="alias"
                type="text"
                placeholder="MI.TIENDA.MAKEUP"
                value={paymentMethods.bankTransfer?.alias || ""}
                onChange={(e) => updateBankTransfer("alias", e.target.value)}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {!paymentMethods.directSale.enabled &&
        !paymentMethods.mercadoPago?.enabled &&
        !paymentMethods.bankTransfer?.enabled && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-gray-500">
              Activa al menos un método de pago para que los clientes puedan
              comprar en tu tienda
            </p>
          </div>
        )}
    </div>
  );
};
