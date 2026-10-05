import { NextRequest, NextResponse } from "next/server";
import Comment from "@/models/Comment";
import Product from "@/models/Product";
import connectDB from "@/config/db";

connectDB();

// GET - Obtener comentarios públicos y promedio de calificación para un producto
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "El ID del producto es requerido" },
        { status: 400 }
      );
    }

    // Buscar el producto
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Obtener comentarios aprobados
    const comments = await Comment.find({
      productId,
      isApproved: true,
    }).sort({ createdAt: -1 });

    // Calcular promedio y desglose de calificaciones
    const totalComments = comments.length;
    let averageRating = 0;
    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalComments > 0) {
      const sum = comments.reduce((acc, curr) => {
        ratingBreakdown[curr.rating] = (ratingBreakdown[curr.rating] || 0) + 1;
        return acc + curr.rating;
      }, 0);
      averageRating = parseFloat((sum / totalComments).toFixed(1));
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalComments,
        averageRating,
        ratingBreakdown,
      },
      comments,
    });
  } catch (error: any) {
    console.error("Error fetching product comments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener los comentarios" },
      { status: 500 }
    );
  }
}

// POST - Agregar un nuevo comentario público
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "El ID del producto es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el producto exista
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "El producto no existe" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { authorName, authorEmail, rating, comment } = body;

    // Validaciones
    if (!authorName || authorName.trim() === "") {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (!comment || comment.trim() === "") {
      return NextResponse.json(
        { success: false, error: "El comentario no puede estar vacío" },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { success: false, error: "La calificación debe ser un número entre 1 y 5" },
        { status: 400 }
      );
    }

    // Crear el comentario
    const newComment = await Comment.create({
      productId,
      authorName: authorName.trim(),
      authorEmail: authorEmail ? authorEmail.trim() : undefined,
      rating: Math.round(numRating),
      comment: comment.trim(),
      isApproved: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "¡Comentario publicado exitosamente!",
        comment: newComment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error posting product comment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al publicar el comentario" },
      { status: 500 }
    );
  }
}
