import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import axios from "axios";

const ProductForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    purchasePrice: "",
    profitMargin: 30,
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await axios.post("/api/products", formData);
      alert("Producto registrado con éxito");
    } catch (error) {
      console.error("Error al registrar producto:", error);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium">Nombre del Producto</label>
        <Input
          type="text"
          name="name"
          placeholder="Ej: Laptop"
          value={formData.name}
          onChange={handleChange}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Precio de Compra</label>
        <Input
          type="number"
          name="purchasePrice"
          placeholder="Ej: 500"
          value={formData.purchasePrice}
          onChange={handleChange}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">
          Margen de Ganancia (%)
        </label>
        <Input
          type="number"
          name="profitMargin"
          placeholder="Ej: 30"
          value={formData.profitMargin}
          onChange={handleChange}
        />
      </div>
      <Button type="submit">Registrar Producto</Button>
    </form>
  );
};

export default ProductForm;
