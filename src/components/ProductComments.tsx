"use client";

import React, { useEffect, useState } from "react";
import { Star, MessageSquare, Send, Loader2, User, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export interface CommentItem {
  _id: string;
  authorName: string;
  authorEmail?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CommentStats {
  totalComments: number;
  averageRating: number;
  ratingBreakdown: Record<number, number>;
}

interface ProductCommentsProps {
  productId: string;
  productName?: string;
  className?: string;
}

export const ProductComments: React.FC<ProductCommentsProps> = ({
  productId,
  productName,
  className = "",
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [stats, setStats] = useState<CommentStats>({
    totalComments: 0,
    averageRating: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [authorName, setAuthorName] = useState<string>("");
  const [authorEmail, setAuthorEmail] = useState<string>("");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentText, setCommentText] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const { toast } = useToast();

  const fetchComments = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/public/${productId}`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Error cargando comentarios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authorName.trim()) {
      toast({
        title: "Campo requerido",
        description: "Por favor ingresa tu nombre.",
        variant: "destructive",
      });
      return;
    }

    if (!commentText.trim()) {
      toast({
        title: "Campo requerido",
        description: "Escribe tu comentario u opinión.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/comments/public/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim() || undefined,
          rating,
          comment: commentText.trim(),
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast({
          title: "¡Gracias por tu opinión!",
          description: "Tu comentario se ha publicado correctamente.",
        });
        setCommentText("");
        setSubmitted(true);
        fetchComments();
      } else {
        throw new Error(result.error || "No se pudo publicar el comentario");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Ocurrió un error al enviar tu comentario.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = interactive
            ? star <= (hoverRating || rating)
            : star <= count;
          return (
            <Star
              key={star}
              className={`h-5 w-5 ${
                interactive ? "cursor-pointer transition-transform hover:scale-110" : ""
              } ${
                isFilled
                  ? "text-amber-400 fill-amber-400"
                  : "text-gray-300 fill-gray-100"
              }`}
              onClick={() => interactive && setRating(star)}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(0)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Card className={`w-full border shadow-sm ${className}`}>
      <CardHeader className="pb-4 border-b bg-gray-50/50">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          Opiniones y Comentarios {productName ? `de ${productName}` : ""}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Resumen de Calificaciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-4 rounded-xl border">
          {/* Promedio Principal */}
          <div className="flex flex-col items-center justify-center text-center p-2 border-r md:border-r-gray-200">
            <span className="text-4xl font-extrabold text-gray-900">
              {stats.averageRating > 0 ? stats.averageRating : "-"}
            </span>
            <div className="my-1.5">{renderStars(Math.round(stats.averageRating))}</div>
            <p className="text-xs text-gray-500 font-medium">
              Basado en {stats.totalComments} {stats.totalComments === 1 ? "opinión" : "opiniones"}
            </p>
          </div>

          {/* Desglose de Estrellas */}
          <div className="md:col-span-2 space-y-1.5 justify-center flex flex-col">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.ratingBreakdown[stars] || 0;
              const percentage =
                stats.totalComments > 0
                  ? Math.round((count / stats.totalComments) * 100)
                  : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <span className="w-12 font-medium text-gray-600 flex items-center gap-0.5">
                    {stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-400 font-mono">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulario para agregar comentario */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            Deja tu comentario
          </h3>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">¡Comentario enviado!</p>
                <p className="text-xs text-green-700">
                  Muchas gracias por compartir tu experiencia con nosotros.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto text-xs"
                onClick={() => setSubmitted(false)}
              >
                Escribir otro
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Tu Calificación:
                </span>
                <div className="flex items-center gap-2">
                  {renderStars(rating, true)}
                  <Badge variant="secondary" className="text-xs font-normal">
                    {rating === 5
                      ? "¡Excelente!"
                      : rating === 4
                      ? "Muy Bueno"
                      : rating === 3
                      ? "Bueno"
                      : rating === 2
                      ? "Regular"
                      : "Malo"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Input
                    placeholder="Tu nombre (obligatorio)"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Tu email (opcional)"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              <div>
                <Textarea
                  placeholder="¿Qué te pareció este producto? Cuéntanos detalles de tu experiencia..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  required
                  className="bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Publicar Comentario
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Lista de Comentarios */}
        <div className="space-y-4 pt-2">
          <h4 className="font-semibold text-gray-700 text-sm flex items-center justify-between">
            <span>Comentarios de la comunidad ({comments.length})</span>
          </h4>

          {loading ? (
            <div className="py-8 flex justify-center items-center text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Cargando opiniones...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 border rounded-xl space-y-2">
              <MessageSquare className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-sm font-medium text-gray-600">
                Aún no hay comentarios sobre este producto
              </p>
              <p className="text-xs text-gray-400">
                Sé el primero en compartir tu opinión con otros compradores.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((item) => (
                <div
                  key={item._id}
                  className="p-4 bg-white rounded-xl border hover:shadow-sm transition-shadow space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {item.authorName ? item.authorName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-gray-900 block leading-tight">
                          {item.authorName}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <div>{renderStars(item.rating)}</div>
                  </div>

                  <p className="text-sm text-gray-700 whitespace-pre-line pl-10">
                    {item.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductComments;
