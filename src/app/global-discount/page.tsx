"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { GlobalDiscountCard } from "@/components/GlobalDiscountCard";

export default function GlobalDiscountPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/promotions")}
            className="hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Descuentos Globales
                </h1>
                <p className="text-gray-600 mt-1">
                  Gestiona descuentos para todos tus productos desde un solo lugar
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Información */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
                <Info className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-900">
                  ¿Qué son los Descuentos Globales?
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    Los descuentos globales te permiten aplicar un porcentaje de descuento
                    a <strong>todos los productos</strong> de tu tienda de forma automática.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <strong>Prioridad:</strong> Los descuentos individuales de productos tienen
                      mayor prioridad que el descuento global
                    </li>
                    <li>
                      <strong>Flexibilidad:</strong> Puedes activar/desactivar el descuento cuando quieras
                    </li>
                    <li>
                      <strong>Fechas:</strong> Configura fechas de inicio y fin para promociones temporales
                    </li>
                    <li>
                      <strong>Control Total:</strong> Actualiza el porcentaje en cualquier momento
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ejemplos de uso */}
        <Card className="border-2 border-purple-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">
              💡 Ejemplos de Uso
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="font-medium text-green-900 mb-2">
                  🎉 Ventas de Temporada
                </p>
                <p className="text-sm text-green-800">
                  Crea un descuento del 20% para Black Friday o ventas de fin de año
                  que se aplique automáticamente a todo tu catálogo.
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-medium text-blue-900 mb-2">
                  🎂 Aniversario de Tienda
                </p>
                <p className="text-sm text-blue-800">
                  Celebra el aniversario de tu tienda con un 15% de descuento
                  en todos los productos durante una semana.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="font-medium text-purple-900 mb-2">
                  🆕 Lanzamiento de Tienda
                </p>
                <p className="text-sm text-purple-800">
                  Atrae clientes nuevos con un 10% de descuento inicial
                  en todo el catálogo durante el primer mes.
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="font-medium text-orange-900 mb-2">
                  🎁 Promociones Flash
                </p>
                <p className="text-sm text-orange-800">
                  Crea urgencia con descuentos del 25% por tiempo limitado
                  en todos los productos (24-48 horas).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card principal de configuración */}
        <GlobalDiscountCard />

        {/* Tip adicional */}
        <Card className="bg-yellow-50 border-2 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-yellow-900 mb-2">
                  Consejo Pro
                </h4>
                <p className="text-sm text-yellow-800">
                  Si tienes productos con descuentos individuales activos, esos descuentos
                  tendrán prioridad sobre el descuento global. Esto te permite mantener
                  promociones especiales en productos específicos mientras aplicas un descuento
                  general al resto del catálogo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
