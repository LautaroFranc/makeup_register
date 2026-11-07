import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const openapiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Nova Insumos - Asistente IA de Inventario",
      version: "1.0.0",
      description:
        "API oficial para que ChatGPT y Claude puedan consultar, crear y actualizar productos, combos e inventario de Nova Insumos en tiempo real.",
    },
    servers: [
      {
        url: baseUrl,
        description: "Servidor Principal de Nova Insumos",
      },
    ],
    paths: {
      "/api/mcp/tools/list_products": {
        get: {
          operationId: "listProducts",
          summary: "Listar productos de Nova Insumos",
          description:
            "Obtiene la lista de productos filtrando por nombre, categoría, marca o stock para Nova Insumos.",
          parameters: [
            {
              name: "search",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Texto a buscar en nombre o marca",
            },
            {
              name: "category",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Categoría (Peluquería, Manicuría, etc.)",
            },
            {
              name: "stockStatus",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: ["all", "in_stock", "low_stock", "out_of_stock"],
              },
              description: "Filtrar por stock (low_stock: 5 unidades o menos)",
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", default: 50 },
              description: "Cantidad máxima de productos a retornar",
            },
          ],
          responses: {
            "200": {
              description: "Lista de productos obtenida exitosamente",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/api/mcp/tools/get_product_detail": {
        get: {
          operationId: "getProductDetail",
          summary: "Obtener detalle completo de un producto",
          description:
            "Obtiene ficha técnica, secciones de acordeón (Modo de uso, Beneficios, Ingredientes), precios y stock.",
          parameters: [
            {
              name: "productId",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "ID de MongoDB o código de barras del producto",
            },
          ],
          responses: {
            "200": {
              description: "Detalle del producto",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/api/mcp/tools/create_product": {
        post: {
          operationId: "createProduct",
          summary: "Crear nuevo producto en Nova Insumos",
          description:
            "Crea un nuevo producto en la tienda Nova Insumos con código interno y código de barras argentino EAN-13 automáticos.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "sellPrice", "buyPrice", "stock", "category"],
                  properties: {
                    name: { type: "string", description: "Nombre del producto" },
                    sellPrice: { type: "number", description: "Precio de venta al público en ARS" },
                    buyPrice: { type: "number", description: "Precio de compra / costo en ARS" },
                    stock: { type: "number", description: "Cantidad inicial en stock" },
                    category: { type: "string", description: "Categoría del producto" },
                    brand: { type: "string", description: "Marca" },
                    description: { type: "string", description: "Descripción general" },
                    sections: {
                      type: "array",
                      description: "Acordeones de información (Resultados, Modo de uso, Ingredientes)",
                      items: {
                        type: "object",
                        required: ["title", "content"],
                        properties: {
                          title: { type: "string" },
                          content: { type: "string" },
                        },
                      },
                    },
                    wholesalePrice: { type: "number", description: "Precio mayorista en ARS" },
                    hasDiscount: { type: "boolean", default: false },
                    discountPercentage: { type: "number", default: 0 },
                    published: { type: "boolean", default: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Producto creado",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/api/mcp/tools/update_product": {
        post: {
          operationId: "updateProduct",
          summary: "Modificar producto existente",
          description: "Actualiza precio, stock, descripción, secciones o visibilidad de un producto.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["productId"],
                  properties: {
                    productId: { type: "string", description: "ID del producto a editar" },
                    name: { type: "string" },
                    sellPrice: { type: "number" },
                    buyPrice: { type: "number" },
                    stock: { type: "number" },
                    category: { type: "string" },
                    brand: { type: "string" },
                    description: { type: "string" },
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["title", "content"],
                        properties: {
                          title: { type: "string" },
                          content: { type: "string" },
                        },
                      },
                    },
                    hasDiscount: { type: "boolean" },
                    discountPercentage: { type: "number" },
                    published: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Producto actualizado",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/api/mcp/tools/list_combos": {
        get: {
          operationId: "listCombos",
          summary: "Listar combos de Nova Insumos",
          description: "Lista los combos y kits promocionales configurados.",
          parameters: [
            {
              name: "activeOnly",
              in: "query",
              required: false,
              schema: { type: "boolean", default: false },
              description: "Solo activos y publicados",
            },
          ],
          responses: {
            "200": {
              description: "Lista de combos",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/api/mcp/tools/create_combo": {
        post: {
          operationId: "createCombo",
          summary: "Crear un combo promocional",
          description: "Agrupa productos existentes en un kit con precio especial.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "comboPrice", "items"],
                  properties: {
                    name: { type: "string" },
                    comboPrice: { type: "number" },
                    description: { type: "string" },
                    published: { type: "boolean", default: true },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["productId", "quantity"],
                        properties: {
                          productId: { type: "string" },
                          quantity: { type: "number", default: 1 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Combo creado exitosamente",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/api/mcp/tools/analyze_inventory": {
        get: {
          operationId: "analyzeInventory",
          summary: "Análisis financiero y métricas de inventario",
          description:
            "Reporte ejecutivo de valorización a costo, venta, margen comercial, quiebres de stock y productos con bajo stock.",
          responses: {
            "200": {
              description: "Reporte de inventario",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
    },
  };

  return NextResponse.json(openapiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
