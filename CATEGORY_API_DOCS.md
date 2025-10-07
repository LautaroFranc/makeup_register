# 📂 API de Categorías - Documentación

## 🎯 Endpoints Disponibles

### 1. **GET `/api/category`** - Obtener todas las categorías

Obtiene todas las categorías del usuario autenticado con estadísticas.

#### **Request:**

```http
GET /api/category
Authorization: Bearer <token>
```

#### **Response:**

```json
{
  "success": true,
  "categories": [
    {
      "name": "Maquillaje",
      "slug": "maquillaje",
      "totalProducts": 15,
      "totalStock": 45,
      "totalValue": "1250.50"
    },
    {
      "name": "Cuidado Facial",
      "slug": "cuidado-facial",
      "totalProducts": 8,
      "totalStock": 23,
      "totalValue": "890.75"
    }
  ]
}
```

---

### 2. **GET `/api/category/[slug]`** - Obtener productos por categoría

Obtiene todos los productos de una categoría específica usando el slug.

#### **Request:**

```http
GET /api/category/maquillaje
Authorization: Bearer <token>
```

#### **Response:**

```json
{
  "success": true,
  "category": {
    "name": "maquillaje",
    "slug": "maquillaje",
    "totalProducts": 15,
    "totalStock": 45,
    "totalValue": "1250.50"
  },
  "products": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Base de Maquillaje",
      "description": "Base líquida de larga duración",
      "image": "https://res.cloudinary.com/...",
      "images": [
        "https://res.cloudinary.com/...",
        "https://res.cloudinary.com/..."
      ],
      "buyPrice": "25.50",
      "sellPrice": "45.00",
      "stock": 10,
      "code": "BASE001",
      "barcode": "7791234567890",
      "category": "maquillaje"
    }
  ]
}
```

#### **Error Response (Categoría no encontrada):**

```json
{
  "success": true,
  "category": "categoria-inexistente",
  "products": [],
  "message": "No products found for this category"
}
```

---

## 🔧 Ejemplos de Uso

### **JavaScript/TypeScript:**

```typescript
// Obtener todas las categorías
const fetchCategories = async () => {
  const response = await fetch("/api/category", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  const data = await response.json();
  return data.categories;
};

// Obtener productos de una categoría específica
const fetchProductsByCategory = async (slug: string) => {
  const response = await fetch(`/api/category/${slug}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  const data = await response.json();
  return data;
};

// Ejemplo de uso
const categories = await fetchCategories();
console.log("Categorías:", categories);

const maquillajeProducts = await fetchProductsByCategory("maquillaje");
console.log("Productos de maquillaje:", maquillajeProducts);
```

### **React Hook:**

```typescript
import { useState, useEffect } from "react";

const useCategoryProducts = (slug: string) => {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/category/${slug}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Error fetching data");

        const data = await response.json();
        setProducts(data.products);
        setCategory(data.category);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug]);

  return { products, category, loading, error };
};
```

---

## 📊 Características

### **Seguridad:**

- ✅ Autenticación requerida (JWT token)
- ✅ Filtrado por usuario (solo productos del usuario autenticado)
- ✅ Validación de parámetros

### **Estadísticas Incluidas:**

- 📦 **totalProducts**: Número total de productos en la categoría
- 📊 **totalStock**: Suma total del stock de todos los productos
- 💰 **totalValue**: Valor total del inventario (precio de compra × stock)

### **Formato de Slug:**

- Los slugs se generan automáticamente: `"Cuidado Facial"` → `"cuidado-facial"`
- Se usan para URLs amigables y búsquedas

### **Manejo de Errores:**

- ✅ Categorías vacías retornan array vacío con mensaje informativo
- ✅ Errores de servidor con códigos HTTP apropiados
- ✅ Validación de parámetros requeridos

---

## 🚀 Casos de Uso

1. **Dashboard de Categorías**: Mostrar resumen de todas las categorías
2. **Página de Categoría**: Listar productos de una categoría específica
3. **Filtros**: Filtrar productos por categoría
4. **Estadísticas**: Mostrar métricas de inventario por categoría
5. **Navegación**: Crear menús de navegación por categorías
