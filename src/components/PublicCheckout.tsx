"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Send,
  CreditCard,
  Building2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  _id: string;
  name: string;
  sellPrice: string;
  image?: string;
}

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
  };
  bankTransfer?: {
    enabled: boolean;
    bankName?: string;
    accountHolder?: string;
    accountType?: string;
    cbu?: string;
    alias?: string;
  };
}

interface PublicCheckoutProps {
  product: Product;
  paymentMethods: PaymentMethods;
  storeName: string;
  quantity?: number;
}

export const PublicCheckout: React.FC<PublicCheckoutProps> = ({
  product,
  paymentMethods,
  storeName,
  quantity = 1,
}) => {
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const totalPrice = parseFloat(product.sellPrice) * quantity;

  // Función para copiar al portapapeles
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast({
      title: "Copiado",
      description: `${fieldName} copiado al portapapeles`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Mensaje de WhatsApp con detalles del producto
  const getWhatsAppMessage = () => {
    const message = `Hola! Me interesa el producto:\n\n*${product.name}*\nCantidad: ${quantity}\nPrecio: $${totalPrice.toFixed(2)}\n\n¿Está disponible?`;
    return encodeURIComponent(message);
  };

  const getWhatsAppUrl = () => {
    const phone = paymentMethods.directSale.whatsapp?.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${getWhatsAppMessage()}`;
  };

  // Verificar si hay al menos un método de pago habilitado
  const hasPaymentMethods =
    paymentMethods.directSale.enabled ||
    paymentMethods.mercadoPago?.enabled ||
    paymentMethods.bankTransfer?.enabled;

  if (!hasPaymentMethods) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Métodos de pago no disponibles en este momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-2xl font-bold text-green-600">
            ${totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Métodos de Pago</h3>

        {/* Venta Directa / Redes Sociales */}
        {paymentMethods.directSale.enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacto Directo</CardTitle>
              <CardDescription>
                Contacta con {storeName} para coordinar tu compra
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {paymentMethods.directSale.whatsapp && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.open(getWhatsAppUrl(), "_blank")}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Consultar por WhatsApp
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.directSale.instagram && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `https://instagram.com/${paymentMethods.directSale.instagram?.replace("@", "")}`,
                        "_blank"
                      )
                    }
                  >
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram
                  </Button>
                )}

                {paymentMethods.directSale.facebook && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(paymentMethods.directSale.facebook, "_blank")
                    }
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </Button>
                )}

                {paymentMethods.directSale.telegram && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `https://t.me/${paymentMethods.directSale.telegram?.replace("@", "")}`,
                        "_blank"
                      )
                    }
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Telegram
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* MercadoPago */}
        {paymentMethods.mercadoPago?.enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagar con MercadoPago
              </CardTitle>
              <CardDescription>
                Tarjetas de crédito, débito y más
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                Pagar Ahora
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Serás redirigido a MercadoPago para completar el pago
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transferencia Bancaria */}
        {paymentMethods.bankTransfer?.enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Transferencia Bancaria
              </CardTitle>
              <CardDescription>
                Transfiere directamente a nuestra cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowBankDetails(true)}
              >
                Ver Datos Bancarios
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Datos Bancarios */}
      <Dialog open={showBankDetails} onOpenChange={setShowBankDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Datos Bancarios</DialogTitle>
            <DialogDescription>
              Realiza la transferencia por ${totalPrice.toFixed(2)} a la
              siguiente cuenta:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {paymentMethods.bankTransfer?.bankName && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Banco</p>
                  <p className="font-medium">
                    {paymentMethods.bankTransfer.bankName}
                  </p>
                </div>
              </div>
            )}

            {paymentMethods.bankTransfer?.accountHolder && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Titular</p>
                  <p className="font-medium">
                    {paymentMethods.bankTransfer.accountHolder}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      paymentMethods.bankTransfer!.accountHolder!,
                      "Titular"
                    )
                  }
                >
                  {copiedField === "Titular" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {paymentMethods.bankTransfer?.accountType && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Tipo de Cuenta</p>
                  <p className="font-medium">
                    {paymentMethods.bankTransfer.accountType === "ahorros"
                      ? "Caja de Ahorros"
                      : "Cuenta Corriente"}
                  </p>
                </div>
              </div>
            )}

            {paymentMethods.bankTransfer?.cbu && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">CBU</p>
                  <p className="font-mono text-sm break-all">
                    {paymentMethods.bankTransfer.cbu}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(paymentMethods.bankTransfer!.cbu!, "CBU")
                  }
                >
                  {copiedField === "CBU" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {paymentMethods.bankTransfer?.alias && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Alias</p>
                  <p className="font-medium">
                    {paymentMethods.bankTransfer.alias}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      paymentMethods.bankTransfer!.alias!,
                      "Alias"
                    )
                  }
                >
                  {copiedField === "Alias" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                📱 Después de realizar la transferencia, envíanos el comprobante
                por WhatsApp para confirmar tu pedido.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
