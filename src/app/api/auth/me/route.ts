import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Users from "@/models/Users";
import connectDB from "@/config/db";
import slugify from "slugify";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Token de autorización requerido" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 }
      );
    }

    // Buscar el usuario en la base de datos
    const user = await Users.findById(decoded.userId).select("-password");

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      slug: user.slug,
    });
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 }
      );
    }

    if (error.name === "TokenExpiredError") {
      return NextResponse.json(
        { success: false, error: "Token expirado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Token de autorización requerido" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 }
      );
    }

    const { name, email, slug } = await req.json();

    // Verificar si el usuario es la cuenta principal (no permitir cambiar slug)
    const currentUser = await Users.findById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // No permitir modificar el slug de la cuenta principal
    if (slug && slug !== currentUser.slug) {
      return NextResponse.json(
        {
          success: false,
          error: "No se puede modificar el slug de la cuenta principal",
        },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe (excluyendo el usuario actual)
    if (email) {
      const existingUser = await Users.findOne({
        email,
        _id: { $ne: decoded.userId },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "El email ya está en uso" },
          { status: 400 }
        );
      }
    }

    // Actualizar el usuario (sin modificar el slug de la cuenta principal)
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    // No actualizar el slug para la cuenta principal

    const updatedUser = await Users.findByIdAndUpdate(
      decoded.userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado exitosamente",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        slug: updatedUser.slug,
      },
    });
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 }
      );
    }

    if (error.name === "TokenExpiredError") {
      return NextResponse.json(
        { success: false, error: "Token expirado" },
        { status: 401 }
      );
    }

    if (error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, error: "Datos de validación inválidos" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
