import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Users from "@/models/Users";

interface DecodedToken {
  id: string;
}

export async function authMiddleware(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || ""
    ) as DecodedToken;
    const user = await Users.findById(decoded.id).select("-password");

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      );
    }
    // Agregar el usuario a la solicitud y continuar con la ejecución
    return NextResponse.json({user:{_id:user._id}}, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
