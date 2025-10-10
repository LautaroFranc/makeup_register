import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Store from "@/models/Store";
import { authMiddleware } from "../middleware";

connectDB();

// GET - Obtener todas las tiendas del usuario
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const includePrivate = searchParams.get("includePrivate") === "true";

    // Construir query
    const query: any = { user: _id };
    if (!includeInactive) {
      query.isActive = true;
    }
    if (!includePrivate) {
      query.isPublic = true;
    }

    const stores = await Store.find(query)
      .sort({ createdAt: -1 })
      .select(
        "name description slug isActive isPublic theme.primaryColor theme.logoUrl metrics totalProducts createdAt updatedAt"
      );

    return NextResponse.json({
      success: true,
      stores,
    });
  } catch (error: any) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear nueva tienda
export async function POST(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const body = await req.json();
    const {
      name,
      description,
      isActive = true,
      isPublic = true,
      theme = {},
      contact = {},
      settings = {},
    } = body;

    // Validar datos requeridos
    if (!name) {
      return NextResponse.json(
        { success: false, error: "El nombre de la tienda es requerido" },
        { status: 400 }
      );
    }

    // Verificar que no exista otra tienda con el mismo nombre para este usuario
    const existingStore = await Store.findOne({
      user: _id,
      name: name.trim(),
    });

    if (existingStore) {
      return NextResponse.json(
        { success: false, error: "Ya existe una tienda con este nombre" },
        { status: 400 }
      );
    }

    // Crear la tienda
    const store = new Store({
      name: name.trim(),
      description: description?.trim(),
      user: _id,
      isActive,
      isPublic,
      theme: {
        primaryColor: theme.primaryColor || "#3B82F6",
        secondaryColor: theme.secondaryColor || "#10B981",
        accentColor: theme.accentColor || "#F59E0B",
        backgroundColor: theme.backgroundColor || "#FFFFFF",
        textColor: theme.textColor || "#1F2937",
        cardBackground: theme.cardBackground || "#F9FAFB",
        borderColor: theme.borderColor || "#E5E7EB",
        logoUrl: theme.logoUrl,
        faviconUrl: theme.faviconUrl,
        customCss: theme.customCss,
      },
      contact: {
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        socialMedia: contact.socialMedia || {},
      },
      settings: {
        allowPublicView: settings.allowPublicView ?? true,
        requireLogin: settings.requireLogin ?? false,
        showPrices: settings.showPrices ?? true,
        showStock: settings.showStock ?? true,
        enableSearch: settings.enableSearch ?? true,
        enableFilters: settings.enableFilters ?? true,
      },
    });

    await store.save();

    return NextResponse.json({
      success: true,
      store: {
        _id: store._id,
        name: store.name,
        description: store.description,
        slug: store.slug,
        isActive: store.isActive,
        isPublic: store.isPublic,
        theme: store.theme,
        contact: store.contact,
        settings: store.settings,
        metrics: store.metrics,
      },
    });
  } catch (error: any) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar tienda
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("id");

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: "ID de tienda requerido" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, description, isActive, isPublic, theme, contact, settings } =
      body;

    // Verificar que la tienda pertenece al usuario
    const store = await Store.findOne({ _id: storeId, user: _id });
    if (!store) {
      return NextResponse.json(
        { success: false, error: "Tienda no encontrada" },
        { status: 404 }
      );
    }

    // Verificar nombre único si se está cambiando
    if (name && name !== store.name) {
      const existingStore = await Store.findOne({
        user: _id,
        name: name.trim(),
        _id: { $ne: storeId },
      });

      if (existingStore) {
        return NextResponse.json(
          { success: false, error: "Ya existe una tienda con este nombre" },
          { status: 400 }
        );
      }
    }

    // Actualizar campos
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (theme) updateData.theme = { ...store.theme, ...theme };
    if (contact) updateData.contact = { ...store.contact, ...contact };
    if (settings) updateData.settings = { ...store.settings, ...settings };

    const updatedStore = await Store.findByIdAndUpdate(storeId, updateData, {
      new: true,
    });

    return NextResponse.json({
      success: true,
      store: updatedStore,
    });
  } catch (error: any) {
    console.error("Error updating store:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar tienda
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("id");

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: "ID de tienda requerido" },
        { status: 400 }
      );
    }

    // Verificar que la tienda pertenece al usuario
    const store = await Store.findOne({ _id: storeId, user: _id });
    if (!store) {
      return NextResponse.json(
        { success: false, error: "Tienda no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si tiene productos asociados
    const Product = (await import("@/models/Product")).default;
    const productCount = await Product.countDocuments({ store: storeId });

    if (productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar la tienda. Tiene ${productCount} producto(s) asociado(s). Primero elimina o mueve los productos.`,
        },
        { status: 400 }
      );
    }

    await Store.findByIdAndDelete(storeId);

    return NextResponse.json({
      success: true,
      message: "Tienda eliminada exitosamente",
    });
  } catch (error: any) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
