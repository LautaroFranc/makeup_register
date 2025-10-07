# 📂 API de Categorías - Documentación Completa

## 🎯 Endpoints Disponibles

### **1. Gestión de Categorías (Autenticado)**

#### **GET `/api/categories`** - Obtener categorías del usuario

```http
GET /api/categories
Authorization: Bearer <token>
```

**Parámetros de consulta:**

- `includeInactive=true` - Incluir categorías inactivas
- `public=true` - Solo categorías con productos publicados

**Respuesta:**

```json
{
  "success": true,
  "categories": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Maquillaje",
      "description": "Productos de maquillaje",
      "color": "#FF6B6B",
      "icon": "💄",
      "isActive": true,
      "productCount": 15,
      "totalProducts": 15,
      "totalStock": 45,
      "totalValue": "1250.50"
    }
  ]
}
```

#### **POST `/api/categories`** - Crear nueva categoría

```http
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nueva Categoría",
  "description": "Descripción opcional",
  "color": "#3B82F6",
  "icon": "📦"
}
```

#### **PUT `/api/categories`** - Actualizar categoría

```http
PUT /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "categoryId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "name": "Categoría Actualizada",
  "description": "Nueva descripción",
  "color": "#FF6B6B",
  "icon": "💄",
  "isActive": true
}
```

#### **DELETE `/api/categories?id=xxx`** - Eliminar categoría

```http
DELETE /api/categories?id=64f1a2b3c4d5e6f7g8h9i0j1
Authorization: Bearer <token>
```

---

### **2. Categorías Públicas (Autenticado)**

#### **GET `/api/categories/public`** - Solo categorías con productos publicados

```http
GET /api/categories/public
Authorization: Bearer <token>
```

**Respuesta:**

```json
{
  "success": true,
  "categories": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Maquillaje",
      "description": "Productos de maquillaje",
      "color": "#FF6B6B",
      "icon": "💄",
      "totalProducts": 12,
      "totalStock": 35,
      "totalValue": "980.50"
    }
  ]
}
```

---

### **3. Categorías Privadas (Autenticado)**

#### **GET `/api/categories/private`** - Todas las categorías del usuario

```http
GET /api/categories/private
Authorization: Bearer <token>
```

**Parámetros de consulta:**

- `includeInactive=true` - Incluir categorías inactivas

**Respuesta:**

```json
{
  "success": true,
  "categories": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Maquillaje",
      "description": "Productos de maquillaje",
      "color": "#FF6B6B",
      "icon": "💄",
      "isActive": true,
      "totalProducts": 15,
      "publicProductCount": 12,
      "privateProductCount": 3,
      "totalStock": 45,
      "totalValue": "1250.50",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### **4. Categorías Públicas por Usuario (Sin Autenticación)**

#### **GET `/api/categories/public/[slug]`** - Categorías públicas de un usuario

```http
GET /api/categories/public/usuario-slug
```

**Respuesta:**

```json
{
  "success": true,
  "user": {
    "name": "María García",
    "slug": "maria-garcia"
  },
  "categories": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Maquillaje",
      "description": "Productos de maquillaje",
      "color": "#FF6B6B",
      "icon": "💄",
      "productCount": 12,
      "totalStock": 35
    }
  ]
}
```

---

### **5. Productos por Categoría (Sin Autenticación)**

#### **GET `/api/categories/[slug]/[categorySlug]`** - Productos de una categoría específica

```http
GET /api/categories/usuario-slug/maquillaje?page=1&limit=10
```

**Parámetros de consulta:**

- `page=1` - Número de página
- `limit=10` - Productos por página (máximo 50)

**Respuesta:**

```json
{
  "success": true,
  "category": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "name": "Maquillaje",
    "description": "Productos de maquillaje",
    "color": "#FF6B6B",
    "icon": "💄",
    "productCount": 12
  },
  "products": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "name": "Base de Maquillaje",
      "description": "Base líquida de larga duración",
      "image": "https://res.cloudinary.com/...",
      "images": ["https://res.cloudinary.com/..."],
      "sellPrice": "45.00",
      "barcode": "7791234567890",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalProducts": 12,
    "hasNextPage": true,
    "hasPrevPage": false,
    "limit": 10
  }
}
```

---

### **6. Estadísticas de Categorías (Autenticado)**

#### **GET `/api/categories/stats`** - Estadísticas de categorías

```http
GET /api/categories/stats
Authorization: Bearer <token>
```

**Respuesta:**

```json
{
  "success": true,
  "stats": {
    "totalCategories": 8,
    "activeCategories": 7,
    "inactiveCategories": 1,
    "publicCategories": 5,
    "emptyCategories": 2,
    "mostPopularCategory": {
      "name": "Maquillaje",
      "totalProducts": 15,
      "publicProducts": 12,
      "privateProducts": 3,
      "color": "#FF6B6B",
      "icon": "💄"
    },
    "categoryBreakdown": [
      {
        "name": "Maquillaje",
        "totalProducts": 15,
        "publicProducts": 12,
        "privateProducts": 3,
        "color": "#FF6B6B",
        "icon": "💄"
      }
    ]
  }
}
```

---

## 🔧 Ejemplos de Uso

### **JavaScript/TypeScript:**

```typescript
// Obtener todas las categorías del usuario
const fetchUserCategories = async () => {
  const response = await fetch("/api/categories", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

// Obtener solo categorías públicas
const fetchPublicCategories = async () => {
  const response = await fetch("/api/categories/public", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

// Obtener categorías públicas de otro usuario
const fetchUserPublicCategories = async (userSlug: string) => {
  const response = await fetch(`/api/categories/public/${userSlug}`);
  return response.json();
};

// Crear nueva categoría
const createCategory = async (categoryData: any) => {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(categoryData),
  });
  return response.json();
};
```

### **React Hook para Categorías:**

```typescript
import { useState, useEffect } from "react";

const useCategories = (type: "all" | "public" | "private" = "all") => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        let endpoint = "/api/categories";

        if (type === "public") endpoint = "/api/categories/public";
        if (type === "private") endpoint = "/api/categories/private";

        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        setCategories(data.categories);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [type]);

  return { categories, loading, error };
};
```

---

## 📊 Características

### **Seguridad:**

- ✅ **Autenticación JWT** para endpoints privados
- ✅ **Filtrado por usuario** en todas las operaciones
- ✅ **Validación de propiedad** antes de modificar/eliminar
- ✅ **Endpoints públicos** sin autenticación para catálogos

### **Funcionalidades:**

- ✅ **CRUD completo** de categorías
- ✅ **Estados activos/inactivos** para gestión
- ✅ **Categorías públicas/privadas** con filtrado automático
- ✅ **Estadísticas en tiempo real** de productos
- ✅ **Slugs únicos** para URLs amigables
- ✅ **Metadatos enriquecidos** (color, icono, descripción)

### **Performance:**

- ✅ **Índices optimizados** para consultas rápidas
- ✅ **Paginación eficiente** en endpoints públicos
- ✅ **Proyecciones selectivas** para reducir transferencia de datos
- ✅ **Caché de estadísticas** para mejor rendimiento

---

## 🚀 Casos de Uso

1. **Panel Administrativo**: Gestión completa de categorías
2. **Catálogo Público**: Mostrar categorías con productos publicados
3. **API Externa**: Integración con otros sistemas
4. **Analytics**: Estadísticas de uso de categorías
5. **SEO**: URLs amigables para motores de búsqueda
