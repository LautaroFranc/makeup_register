import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Users, { UserRole } from "@/models/Users";

interface DecodedToken {
  userId: string;
  email: string;
  slug: string;
  role: UserRole; // 👈 Incluir rol en el token decodificado
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
    const user = await Users.findById(decoded.userId).select("-password");

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      );
    }
    // Agregar el usuario a la solicitud y continuar con la ejecución
    return NextResponse.json(
      { user: { _id: user._id, slug: user.slug, role: user.role } },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}

// 👇 Funciones helper para verificar roles

/**
 * Verifica el token JWT y retorna los datos del usuario
 */
export async function verifyToken(req: NextRequest): Promise<DecodedToken | null> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || ""
    ) as DecodedToken;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware que verifica si el usuario tiene uno de los roles permitidos
 */
export async function requireRole(req: NextRequest, allowedRoles: UserRole[]) {
  const decoded = await verifyToken(req);

  if (!decoded) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!allowedRoles.includes(decoded.role)) {
    return NextResponse.json(
      { error: "No tienes permisos para realizar esta acción" },
      { status: 403 }
    );
  }

  return decoded; // Retornar el token decodificado si tiene permiso
}

/**
 * Verifica si el usuario es administrador
 */
export async function requireAdmin(req: NextRequest) {
  return requireRole(req, ["admin"]);
}

/**
 * Verifica si el usuario es administrador o gerente
 */
export async function requireManagerOrAdmin(req: NextRequest) {
  return requireRole(req, ["admin", "manager"]);
}

/**
 * Verifica si el usuario está autenticado (cualquier rol)
 */
export async function requireAuth(req: NextRequest) {
  return requireRole(req, ["admin", "manager", "employee"]);
}
