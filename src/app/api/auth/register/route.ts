import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import Users from "@/models/Users";
import connectDB from "@/config/db";

connectDB();

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json();

    const userExists = await Users.findOne({ email });
    if (userExists) {
      return NextResponse.json(
        { success: false, message: "El usuario ya existe" },
        { status: 400 }
      );
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear nuevo usuario
    const newUser = new Users({ name, email, role, password: hashedPassword });
    await newUser.save();

    return NextResponse.json(
      { success: true, message: "Usuario registrado con éxito" },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
