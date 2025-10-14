# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **makeup/beauty product inventory management system** built with Next.js 15, TypeScript, and MongoDB. It supports multi-store functionality where users can create stores, manage product catalogs, track inventory, and publish public storefronts. The application includes both private admin panels and public-facing store pages.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens stored in localStorage
- **File Upload**: Cloudinary for images
- **Charts**: Chart.js, Recharts

## Development Commands

### Running the Application
```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Environment Variables Required
Create a `.env` file with:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## Architecture

### Data Model Hierarchy

The system follows a **User → Store → Product/Category** hierarchy:

1. **Users** (`src/models/Users.ts`)
   - Each user has a unique slug generated from their name
   - Authenticates with JWT tokens
   - Can own multiple stores

2. **Stores** (`src/models/Store.ts`)
   - Each store belongs to one user (via `user` field)
   - Has a unique slug for public URLs
   - Contains theme configuration, contact info, and settings
   - Tracks metrics (total products, categories, stock, value)
   - Can be public or private (`isPublic` flag)

3. **Categories** (`src/models/Category.ts`)
   - Belong to both a user AND a store (via `user` and `store` fields)
   - Have visual metadata (color, icon)
   - Track product count
   - Can be active/inactive (`isActive` flag)
   - Unique per user and store combination

4. **Products** (`src/models/Product.ts`)
   - Belong to a user, store, and category
   - Support multiple images and dynamic attributes (e.g., colors, sizes)
   - Have buy/sell prices stored as strings
   - Include barcode (EAN-13/EAN-8) - must be unique
   - Can be published/unpublished (`published` boolean)
   - Stock tracking included

5. **SaleProduct** (`src/models/SaleProduct.ts`)
   - Tracks product sales with timestamp
   - Links to products via `idProduct`

### Authentication Flow

- Login: POST `/api/auth/login` returns JWT token
- Client stores token in localStorage
- Protected routes include `Authorization: Bearer <token>` header
- Middleware (`src/middleware.ts`) adds CORS headers to all API routes
- Auth helper (`src/app/api/middleware.ts`) validates JWT and extracts user
- User context (`src/contexts/UserContext.tsx`) manages auth state globally

### API Route Patterns

#### Private (Authenticated) Routes
Routes require `Authorization: Bearer <token>` header:
- `/api/products/private` - User's products
- `/api/categories/private` - User's categories
- `/api/categories` - CRUD operations
- `/api/stores` - Store management

#### Public (Unauthenticated) Routes
Routes accessible without auth for storefront:
- `/api/products/public/[id]` - Public product details
- `/api/categories/public/[slug]` - Public categories by user slug
- `/api/categories/[slug]/[categorySlug]` - Products in a category
- `/api/stores/[slug]` - Public store details

See `CATEGORIES_API_DOCS.md` for detailed category API documentation.

### Database Connection

- Connection utility: `src/config/db.ts`
- Uses global caching to prevent multiple connections in development
- Always call `connectDB()` at the start of API routes

### Component Organization

#### UI Components (`src/components/ui/`)
shadcn/ui components with Tailwind styling:
- Form components: `button`, `input`, `select`, `textarea`, `label`
- Layout: `card`, `table`, `sidebar`, `separator`, `sheet`
- Feedback: `toast`, `alert-dialog`, `dialog`, `popover`, `tooltip`
- Data display: `badge`, `avatar`, `skeleton`, `chart`

#### Business Components (`src/components/`)
- `ProductForm.tsx` - Product creation/editing with dynamic attributes
- `ProductEditModal.tsx` - Modal for editing products
- `CategorySelect.tsx` - Category selector with search
- `ImageUploadSquare.tsx`, `MultiImageUpload.tsx` - Cloudinary uploads
- `BarcodeDisplay.tsx`, `BarcodeModal.tsx` - Barcode generation/display
- `SaleModal.tsx` - Record product sales
- `PurchaseTable/` - Purchase history management
- `table/` - Product table views (row, card, editable cells)

### Frontend State Management

- **User Context**: `src/contexts/UserContext.tsx` provides global user state
- **Custom Hooks**: `src/hooks/useFetch.ts` for API calls
- **Local State**: React useState for component-level state
- No Redux or external state library

### Image Handling

- Cloudinary config: `src/config/cloudinary.ts`
- Upload endpoint: `/api/products/images` (POST)
- Images stored as URLs in MongoDB
- Products support single `image` and array `images[]`

### Barcode System

- Utilities: `src/lib/barcodeUtils.ts`
- Validation endpoint: `/api/products/check-barcode`
- Uses jsbarcode library for display
- Must be unique across all products

## Key Patterns & Conventions

### API Route Structure
```typescript
// Always connect to DB first
await connectDB();

// Extract JWT token
const authHeader = req.headers.get("authorization");
const token = authHeader.split(" ")[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);

// Query with user filter
const items = await Model.find({ user: decoded.userId });
```

### Slug Generation
Models use `slugify` package in pre-save hooks:
```typescript
SchemaName.pre<ISchemaType>("save", function (next) {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});
```

### Product Attributes
Products have a flexible `attributes` field:
```json
{
  "attributes": {
    "color": ["rojo", "azul", "verde"],
    "tamaño": ["S", "M", "L"],
    "tipo": ["mate", "brillante"]
  }
}
```

### Price Storage
Prices stored as strings to avoid floating-point issues:
```typescript
buyPrice: string;  // "45.99"
sellPrice: string; // "65.00"
```

### Public/Private Product Filtering
- Products have `published: boolean` field
- Public APIs filter by `published: true`
- Private APIs show all products regardless of `published` status

## Common Development Tasks

### Adding a New Product Field
1. Update interface in `src/models/Product.ts`
2. Add to Mongoose schema with defaults
3. Update `ProductForm.tsx` to include field
4. Modify API routes to accept/return field
5. Update TypeScript interfaces in components

### Creating a New API Endpoint
1. Create route file in `src/app/api/[endpoint]/route.ts`
2. Import `connectDB` and models
3. Export async `GET`, `POST`, `PUT`, `DELETE` functions
4. Use `NextRequest` and `NextResponse` types
5. Add authentication if needed using `src/app/api/middleware.ts`

### Adding a New Model
1. Create model file in `src/models/[ModelName].ts`
2. Define TypeScript interface extending `Document`
3. Create Mongoose schema with timestamps
4. Add indexes for performance
5. Export with singleton pattern: `mongoose.models.Model || mongoose.model(...)`

## Important Notes

- **Mongoose Models**: Always use the singleton pattern to prevent model re-compilation errors in development
- **JWT Tokens**: Stored in localStorage, NOT httpOnly cookies
- **CORS**: Enabled globally via middleware for all `/api/*` routes
- **Timestamps**: All models have `createdAt` and `updatedAt` via `{ timestamps: true }`
- **Error Handling**: API routes return `{ error: string }` for failures, `{ success: true }` for success
- **File Uploads**: Use formidable for multipart/form-data parsing in API routes
- **Responsive Design**: UI uses Tailwind breakpoints, mobile-first approach
- **Type Safety**: Strict TypeScript - avoid `any` types where possible
