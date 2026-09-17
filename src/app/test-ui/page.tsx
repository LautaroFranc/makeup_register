"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ChevronRight, ChevronLeft, Save, LayoutTemplate, SquareSplitHorizontal, ArrowRightLeft, Maximize2 } from "lucide-react";

export default function TestUIOptions() {
  const [activeView, setActiveView] = useState<"sidebar" | "tabs" | "wizard">("sidebar");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Opciones de Rediseño de UI/UX</h1>
        <p className="text-gray-500">Selecciona una de las opciones para ver cómo se vería el formulario de productos.</p>
        
        <div className="flex justify-center gap-4">
          <Button 
            variant={activeView === "sidebar" ? "default" : "outline"} 
            onClick={() => setActiveView("sidebar")}
            className="w-48 h-16 flex flex-col gap-1"
          >
            <SquareSplitHorizontal className="w-5 h-5" />
            Opción 1: Columnas
          </Button>
          <Button 
            variant={activeView === "tabs" ? "default" : "outline"} 
            onClick={() => setActiveView("tabs")}
            className="w-48 h-16 flex flex-col gap-1"
          >
            <LayoutTemplate className="w-5 h-5" />
            Opción 2: Pestañas
          </Button>
          <Button 
            variant={activeView === "wizard" ? "default" : "outline"} 
            onClick={() => setActiveView("wizard")}
            className="w-48 h-16 flex flex-col gap-1"
          >
            <ArrowRightLeft className="w-5 h-5" />
            Opción 3: Pasos
          </Button>
        </div>
        
        <div className="pt-4">
          <Button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Maximize2 className="w-4 h-4 mr-2" />
            Ver opción actual dentro de un Modal
          </Button>
        </div>
      </div>

      <div className="mt-8 border-t pt-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Vista a pantalla completa</h3>
        {activeView === "sidebar" && <SidebarView />}
        {activeView === "tabs" && <TabsView />}
        {activeView === "wizard" && <WizardView />}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 50,
          }}
        >
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Ejemplo de Modal ({
              activeView === 'sidebar' ? 'Columnas' : 
              activeView === 'tabs' ? 'Pestañas' : 'Pasos'
            })</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 p-6">
            {activeView === "sidebar" && <SidebarView inModal={true} />}
            {activeView === "tabs" && <TabsView />}
            {activeView === "wizard" && <WizardView />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// OPCIÓN 1: DISEÑO A DOS COLUMNAS (SIDEBAR)
// ==========================================
function SidebarView({ inModal = false }: { inModal?: boolean }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!inModal && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Crear Producto</h2>
            <p className="text-gray-500">Opción 1: Diseño profesional e-commerce a dos columnas.</p>
          </div>
          <div className="space-x-3">
            <Button variant="outline">Descartar</Button>
            <Button><Save className="w-4 h-4 mr-2" /> Guardar Producto</Button>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${inModal ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
        {/* Columna Principal (Izquierda) */}
        <div className={`${inModal ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-6`}>
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Producto</Label>
                <Input placeholder="Ej. Base de Maquillaje Líquida" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea placeholder="Detalles del producto..." rows={4} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imágenes (Mockup visual)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 bg-gray-50">
                Área de subida de imágenes (Arrastra y suelta)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios y Márgenes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Costo ($)</Label>
                  <Input placeholder="$0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Margen Minorista (%)</Label>
                  <Input placeholder="50" />
                </div>
                <div className="space-y-2">
                  <Label>Precio de Venta ($)</Label>
                  <Input placeholder="$0.00" />
                </div>
                
                <div className="col-span-full border-t my-2"></div>
                
                <div className="col-start-2 space-y-2">
                  <Label>Margen Mayorista (%)</Label>
                  <Input placeholder="20" />
                </div>
                <div className="space-y-2">
                  <Label>Precio Mayorista ($)</Label>
                  <Input placeholder="$0.00" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Lateral (Derecha) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estado y Visibilidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Publicado en la tienda</Label>
                <Switch checked={true} />
              </div>
              <p className="text-xs text-gray-500">
                Los clientes podrán ver este producto en tu tienda pública.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organización e Inventario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input placeholder="Seleccionar categoría..." />
              </div>
              <div className="space-y-2">
                <Label>Stock Actual</Label>
                <Input type="number" placeholder="0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Descuentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activar Descuento</Label>
                <Switch checked={false} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// OPCIÓN 2: SISTEMA DE PESTAÑAS (TABS)
// ==========================================
function TabsView() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Crear Producto</h2>
          <p className="text-gray-500">Opción 2: Formulario organizado por pestañas.</p>
        </div>
        <div className="space-x-3">
          <Button variant="outline">Descartar</Button>
          <Button><Save className="w-4 h-4 mr-2" /> Guardar Producto</Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="general" className="h-full">Información General</TabsTrigger>
          <TabsTrigger value="media" className="h-full">Imágenes</TabsTrigger>
          <TabsTrigger value="pricing" className="h-full">Precios y Stock</TabsTrigger>
          <TabsTrigger value="settings" className="h-full">Atributos y Promos</TabsTrigger>
        </TabsList>
        
        <div className="mt-6 border rounded-lg bg-white p-6 shadow-sm min-h-[400px]">
          <TabsContent value="general" className="space-y-6 mt-0">
            <h3 className="text-lg font-semibold border-b pb-2">Información Básica</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Producto</Label>
                <Input placeholder="Ej. Base de Maquillaje Líquida" />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input placeholder="Seleccionar categoría..." />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea placeholder="Detalles del producto..." rows={5} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-0">
            <h3 className="text-lg font-semibold border-b pb-2 mb-6">Galería de Imágenes</h3>
            <div className="w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 bg-gray-50">
              Área de subida de imágenes
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6 mt-0">
            <h3 className="text-lg font-semibold border-b pb-2">Configuración de Precios e Inventario</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Stock Actual</Label>
                <Input type="number" placeholder="0" className="w-1/3" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Costo de Compra ($)</Label>
                  <Input placeholder="$0.00" />
                </div>
                
                <div className="space-y-2">
                  <Label>Margen Minorista (%)</Label>
                  <Input placeholder="50" />
                </div>
                <div className="space-y-2">
                  <Label>Precio de Venta ($)</Label>
                  <Input placeholder="$0.00" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="col-start-2 space-y-2">
                  <Label>Margen Mayorista (%)</Label>
                  <Input placeholder="20" />
                </div>
                <div className="space-y-2">
                  <Label>Precio Mayorista ($)</Label>
                  <Input placeholder="$0.00" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-0">
             <h3 className="text-lg font-semibold border-b pb-2">Opciones Avanzadas</h3>
             <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <Label className="text-base">Visibilidad del Producto</Label>
                  <p className="text-sm text-gray-500">¿Quieres que los clientes vean este producto?</p>
                </div>
                <Switch checked={true} />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <Label className="text-base">Descuento Activo</Label>
                  <p className="text-sm text-gray-500">Configurar promociones temporales</p>
                </div>
                <Switch checked={false} />
              </div>

              <div className="p-4 border rounded-lg border-dashed">
                <p className="text-center text-gray-500 font-medium">Gestor de Atributos Dinámicos (Color, Tamaño, etc.)</p>
              </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}


// ==========================================
// OPCIÓN 3: ASISTENTE PASO A PASO (WIZARD)
// ==========================================
function WizardView() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    { num: 1, title: "Básicos" },
    { num: 2, title: "Precios" },
    { num: 3, title: "Detalles" },
    { num: 4, title: "Revisión" }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold">Añadir Nuevo Producto</h2>
        <p className="text-gray-500">Opción 3: Proceso guiado paso a paso.</p>
      </div>

      {/* Progress Bar / Steps */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded transition-all duration-300"
          style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
        ></div>
        
        {steps.map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-2 bg-white px-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 
              ${step === s.num ? 'border-blue-600 bg-blue-600 text-white' : 
                step > s.num ? 'border-blue-600 bg-white text-blue-600' : 'border-gray-300 bg-white text-gray-400'}`}>
              {step > s.num ? <Check className="w-5 h-5" /> : s.num}
            </div>
            <span className={`text-xs font-medium ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      <Card className="shadow-lg border-0 shadow-gray-200">
        <CardContent className="p-8 min-h-[400px] flex flex-col">
          
          <div className="flex-grow">
            {/* Step 1 Content */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-xl font-bold">¿Qué producto vas a vender?</h3>
                <div className="space-y-2">
                  <Label>Nombre del Producto</Label>
                  <Input placeholder="Ej. Base de Maquillaje Líquida" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Categoría principal</Label>
                  <Input placeholder="Seleccionar..." className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Descripción corta</Label>
                  <Textarea placeholder="Cuéntale a tus clientes sobre este producto" rows={3} />
                </div>
              </div>
            )}

            {/* Step 2 Content */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-xl font-bold">Costos y Ganancias</h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                    <Label className="font-semibold text-base">Costos Base</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Costo ($)</Label>
                        <Input placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Stock Actual</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-4">
                    <Label className="font-semibold text-base">Venta Minorista</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Margen (%)</Label>
                        <Input placeholder="50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio Venta ($)</Label>
                        <Input placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 Content */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-xl font-bold">Imágenes y Extras</h3>
                <div className="w-full h-40 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                  Haz clic o arrastra fotos aquí
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-semibold text-base">Atributos Dinámicos</Label>
                    <Button variant="outline" size="sm">Añadir Atributo</Button>
                  </div>
                  <p className="text-sm text-gray-500">Color, tamaño, fragancia, etc.</p>
                </div>
              </div>
            )}

            {/* Step 4 Content */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-xl font-bold text-center">¡Casi listo!</h3>
                <div className="text-center p-6 bg-green-50 text-green-800 rounded-lg border border-green-200">
                  <Check className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <p className="font-medium text-lg">El producto está listo para publicarse</p>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-bold text-base">¿Publicar ahora?</Label>
                    <p className="text-sm text-gray-500">Si lo desactivas, quedará como borrador.</p>
                  </div>
                  <Switch checked={true} />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Atrás
            </Button>
            
            {step < totalSteps ? (
              <Button onClick={() => setStep(Math.min(totalSteps, step + 1))}>
                Siguiente <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" /> Guardar Producto
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
