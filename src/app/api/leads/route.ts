import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Lead from "@/models/Lead";
import Users from "@/models/Users";
import Store from "@/models/Store";
import { authMiddleware, verifyToken } from "../middleware";
import { sendWelcomeEmail } from "@/lib/mailer";

connectDB();

// GET: Obtener lista de leads/clientes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slugParam = searchParams.get("slug");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    let userId: string | null = null;
    let targetSlug: string | undefined = slugParam || undefined;

    // Si viene slug por query param (ej: catálogo público)
    if (slugParam) {
      const userFound: any = await Users.findOne({ slug: slugParam });
      if (userFound) {
        userId = userFound._id.toString();
      }
    }

    // Si no vino slug o no se halló, intentamos autenticación por Token
    if (!userId) {
      const decoded = await verifyToken(req);
      if (decoded) {
        userId = decoded.userId;
        targetSlug = decoded.slug;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "No autorizado o slug no provisto" },
        { status: 401 }
      );
    }

    const query: any = { user: userId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: leads,
    });
  } catch (error: any) {
    console.error("Error al obtener leads:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener los leads" },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo lead/cliente (acepta slug del usuario/tienda o Token)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, status, notes, source, slug } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    let targetUser: any = null;
    let targetStore: any = null;
    let leadSlug: string | undefined = slug;

    // 1. Si enviaron slug en el body (ej: desde tienda pública / landing)
    if (slug) {
      targetUser = await Users.findOne({ slug });
      if (targetUser) {
        targetStore = await Store.findOne({ user: targetUser._id });
      }
    }

    // 2. Si no enviaron slug o no se encontró el usuario por slug, verificar por Token JWT
    if (!targetUser) {
      const decoded = await verifyToken(req);
      if (decoded) {
        targetUser = await Users.findById(decoded.userId);
        if (targetUser) {
          leadSlug = targetUser.slug;
          targetStore = await Store.findOne({ user: targetUser._id });
        }
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Usuario o tienda no encontrada para vincular el lead" },
        { status: 404 }
      );
    }

    const newLead = await Lead.create({
      name,
      email,
      phone,
      status: status || "nuevo",
      notes,
      source: source || (slug ? "Tienda Web" : "Manual"),
      slug: leadSlug || targetUser.slug,
      store: targetStore ? targetStore._id : undefined,
      user: targetUser._id,
    });

    // Enviar email de bienvenida si proporcionó un email
    if (email && email.trim() !== "") {
      sendWelcomeEmail({
        to: email,
        name,
        storeName: targetStore?.name || targetUser.name,
        customSubject: targetStore?.settings?.welcomeEmailSubject,
        customTemplate: targetStore?.settings?.welcomeEmailTemplate,
      }).catch((err) => console.error("Error asíncrono al enviar bienvenida:", err));
    }

    return NextResponse.json(
      {
        success: true,
        message: "Lead creado exitosamente",
        data: newLead,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear lead:", error);
    return NextResponse.json(
      { success: false, error: "Error al registrar el lead" },
      { status: 500 }
    );
  }
}
