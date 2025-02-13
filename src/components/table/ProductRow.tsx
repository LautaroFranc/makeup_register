import { TableRow, TableCell } from "@/components/ui/table";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Trash2, BadgeDollarSign } from "lucide-react";
import EditableCell from "./EditableCell";
import { formatToARS } from "@/lib/utils";

interface Product {
  _id: string;
  name: string;
  image?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
}

interface EditingCell {
  _id: string;
  field: string;
}

interface ProductRowProps {
  product: Product;
  editingCell: EditingCell;
  setEditingCell: (cell: EditingCell) => void;
  handleEdit: (_id: string, field: string, value: string | number) => void;
  handleDelete: (_id: string) => void;
  handleOpenSaleModal: (product: string) => void;
  calculateMargin: (buyPrice: number, sellPrice: number) => string;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  editingCell,
  setEditingCell,
  handleEdit,
  handleDelete,
  calculateMargin,
  handleOpenSaleModal,
}) => {
  return (
    <TableRow>
      <TableCell>
        <Image
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          width={70}
          height={70}
          className="rounded-md"
        />
      </TableCell>
      <EditableCell
        value={product.name}
        isEditing={
          editingCell._id === product._id && editingCell.field === "name"
        }
        onEdit={(value: any) => handleEdit(product._id, "name", value)}
        onStartEditing={() =>
          setEditingCell({ _id: product._id, field: "name" })
        }
      />
      <EditableCell
        price
        value={product.buyPrice}
        isEditing={
          editingCell._id === product._id && editingCell.field === "buyPrice"
        }
        onEdit={(value: any) =>
          handleEdit(product._id, "buyPrice", Number(value))
        }
        onStartEditing={() =>
          setEditingCell({ _id: product._id, field: "buyPrice" })
        }
        isNumber
      />
      <EditableCell
        price
        value={product.sellPrice}
        isEditing={
          editingCell._id === product._id && editingCell.field === "sellPrice"
        }
        onEdit={(value: any) =>
          handleEdit(product._id, "sellPrice", Number(value))
        }
        onStartEditing={() =>
          setEditingCell({ _id: product._id, field: "sellPrice" })
        }
        isNumber
      />
      <TableCell>
        <span
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
    ${
      Number(calculateMargin(product.buyPrice, product.sellPrice)) >= 0
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700"
    }`}
        >
          {calculateMargin(product.buyPrice, product.sellPrice)}%
        </span>
      </TableCell>
      <EditableCell
        value={product.stock}
        isNumber
        isEditing={
          editingCell._id === product._id && editingCell.field === "stock"
        }
        onEdit={(value: any) => handleEdit(product._id, "stock", Number(value))}
        onStartEditing={() =>
          setEditingCell({ _id: product._id, field: "stock" })
        }
      />
      <TableCell>{formatToARS(product.sellPrice * product.stock)}</TableCell>
      <TableCell>
        <div className=" flex gap-7 justify-end">
          <Button
            variant="destructive"
            size="icon"
            onClick={() => handleDelete(product._id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={() => handleOpenSaleModal(product._id)}>
            <BadgeDollarSign />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default ProductRow;
