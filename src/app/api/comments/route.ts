import { NextRequest, NextResponse } from "next/server";
import Comment from "@/models/Comment";
import Product from "@/models/Product";
import connectDB from "@/config/db";
import { authMiddleware } from "../middleware";

connectDB();

// GET - Obtener todos los comentarios de los productos del usuario autenticado
export async function GET(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    // Obtener los productos del usuario
    const userProducts = await Product.find({ user: _id }).select("_id name");
    const productIds = userProducts.map((p) => (p._id as any).toString());
    const productMap = new Map(userProducts.map((p) => [(p._id as any).toString(), p.name]));

    // Obtener comentarios de esos productos
    const comments = await Comment.find({ productId: { $in: productIds } }).sort({
      createdAt: -1,
    });

    const commentsWithProductName = comments.map((c) => ({
      ...c.toObject(),
      productName: productMap.get(c.productId) || "Producto desconocido",
    }));

    return NextResponse.json({
      success: true,
      comments: commentsWithProductName,
    });
  } catch (error: any) {
    console.error("Error fetching admin comments:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un comentario por ID (autenticado)
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await authMiddleware(req);
    if (authCheck.status !== 200) return authCheck;
    const { _id } = (await authCheck.json()).user;

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("id");

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: "El ID del comentario es requerido" },
        { status: 400 }
      );
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { success: false, error: "Comentario no encontrado" },
        { status: 404 }
      );
    }

    // Verificar pertenencia del producto al usuario
    const product = await Product.findById(comment.productId);
    if (!product || product.user.toString() !== _id) {
      return NextResponse.json(
        { success: false, error: "No autorizado para eliminar este comentario" },
        { status: 403 }
      );
    }

    await Comment.findByIdAndDelete(commentId);

    return NextResponse.json({
      success: true,
      message: "Comentario eliminado correctamente",
    });
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
