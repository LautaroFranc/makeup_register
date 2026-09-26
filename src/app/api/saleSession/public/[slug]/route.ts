import { NextRequest, NextResponse } from "next/server";
import OrderSession from "@/models/OrderSession";
import Store from "@/models/Store";
import connectDB from "@/config/db";

// POST - Iniciar o actualizar una sesión de carrito
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await connectDB();
    const { slug } = await params;
    const body = await req.json();

    const { sessionId, customerEmail, customerPhone, products, totalAmount, status } = body;

    // Endpoint público: el status llega del cliente, hay que validarlo contra el enum
    // del modelo para que un payload arbitrario no contamine el embudo de analíticas.
    const VALID_STATUSES = ["CART_CREATED", "PAYMENT_INITIATED", "COMPLETED", "ABANDONED"] as const;
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, message: "Status inválido" }, { status: 400 });
    }

    const store = await Store.findOne({ slug, isActive: true });
    if (!store) {
      return NextResponse.json({ success: false, message: "Tienda no encontrada" }, { status: 404 });
    }

    // Si ya existe la sesión, la actualizamos
    if (sessionId) {
      const updatedSession = await OrderSession.findByIdAndUpdate(
        sessionId,
        {
          $set: {
            customerEmail: customerEmail || undefined,
            customerPhone: customerPhone || undefined,
            products: products || undefined,
            totalAmount: totalAmount || undefined,
            status: status || undefined,
          }
        },
        { new: true }
      );
      
      return NextResponse.json({ success: true, session: updatedSession });
    }

    // Si no existe, creamos una nueva
    const newSession = await OrderSession.create({
      storeId: store._id,
      products: products || [],
      totalAmount: totalAmount || 0,
      status: status || "CART_CREATED",
      customerEmail,
      customerPhone
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (error: any) {
    console.error("Error al manejar sesión de carrito:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
