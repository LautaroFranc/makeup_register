"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductComments } from "./ProductComments";

interface ProductCommentsModalProps {
  productId: string | null;
  productName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductCommentsModal: React.FC<ProductCommentsModalProps> = ({
  productId,
  productName,
  isOpen,
  onClose,
}) => {
  if (!productId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="sr-only">
          <DialogTitle>Opiniones del producto</DialogTitle>
        </DialogHeader>
        <ProductComments productId={productId} productName={productName} />
      </DialogContent>
    </Dialog>
  );
};

export default ProductCommentsModal;
