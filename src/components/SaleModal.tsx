import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Modal from "./Modal";

interface Product {
  _id: string;
  name: string;
  image?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
}
interface SaleModalProps {
  product: Product | null;
  onClose: () => void;
  onConfirm: (saleData: { productId: string; quantity: number }) => void;
}

const SaleModal: React.FC<SaleModalProps> = ({
  product,
  onClose,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [total, setTotal] = useState<number>(product?.sellPrice || 0);

  const handleQuantityChange = (value: string) => {
    const qty = parseInt(value, 10) || 0;
    setQuantity(qty);
    setTotal((product?.sellPrice || 0) * qty);
  };

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= (product?.stock || 0)) {
      onConfirm({ productId: product!._id, quantity });
    } else {
      alert("Cantidad no válida");
    }
  };

  return (
    <Modal open={!!product} onClose={onClose} title="Registrar Venta">
      <div>
        <p>Producto: {product?.name}</p>
        <p>Precio Unitario: ${product?.sellPrice}</p>
        <p>Stock Disponible: {product?.stock}</p>

        <Input
          type="number"
          value={quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          min="1"
          max={product?.stock || 1}
          placeholder="Cantidad"
          className="mt-2"
        />

        <p className="mt-4">Total: ${total}</p>

        <div className="flex justify-end mt-6 space-x-4">
          <Button onClick={handleConfirm}>Confirmar Venta</Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SaleModal;
