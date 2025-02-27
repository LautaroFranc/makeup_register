import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Buscar usuario por email
    const user = await Users.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Usuario no encontrado" },
        { status: 400 }
      );
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json(
        { success: false, message: "Contraseña incorrecta" },
        { status: 400 }
      );
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, slug: user.slug },
      process.env.JWT_SECRET || ""
    );

    return NextResponse.json({ success: true, token }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
