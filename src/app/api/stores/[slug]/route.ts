import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/config/db";
import Store from "@/models/Store";
import Users from "@/models/Users";

connectDB();

// GET - Obtener tienda por slug (público)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const store = await Store.findOne({
      slug,
      isActive: true,
      isPublic: true,
    }).select(
      "name description slug theme contact settings metrics createdAt updatedAt"
    );

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Tienda no encontrada" },
        { status: 404 }
      );
    }

    // Obtener información del usuario propietario
    const user = await Users.findById(store.user).select("name email slug");

    return NextResponse.json({
      success: true,
      store: {
        ...store.toObject(),
        owner: {
          name: user?.name,
          email: user?.email,
          slug: user?.slug,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching store:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
