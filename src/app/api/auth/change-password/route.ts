import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Users from "@/models/Users";
import connectDB from "@/config/db";
import bcrypt from "bcryptjs";

connectDB();

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

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Contraseña actual y nueva contraseña son requeridas",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "La nueva contraseña debe tener al menos 6 caracteres",
        },
        { status: 400 }
      );
    }

    // Buscar el usuario con la contraseña
    const user = await Users.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Verificar la contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Contraseña actual incorrecta" },
        { status: 400 }
      );
    }

    // Hashear la nueva contraseña
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar la contraseña
    await Users.findByIdAndUpdate(decoded.userId, {
      password: hashedNewPassword,
    });

    return NextResponse.json({
      success: true,
      message: "Contraseña cambiada exitosamente",
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
