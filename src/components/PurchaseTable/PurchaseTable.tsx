import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatDate, formatToARS } from "@/lib/utils";
import Image from "next/image";

interface Purchase {
  name: string;
  image: string;
  totalPrice: number;
  totalStockSold: number;
  createdAt: string;
}

interface PurchaseTableProps {
  purchases: Purchase[];
}

export default function PurchaseTable({ purchases }: PurchaseTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead>Cantidad Vendida</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Fecha</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {purchases.map(
          ({ name, image, totalPrice, totalStockSold, createdAt }, index) => (
            <TableRow key={index}>
              <TableCell className="flex items-center gap-3">
                <Image
                  src={image}
                  alt={name}
                  width={50}
                  height={50}
                  className="rounded-md"
                />
                <p>{name}</p>
              </TableCell>
              <TableCell className="font-bold">{totalStockSold}</TableCell>
              <TableCell className="font-bold">
                <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700   rounded-full text-sm font-medium">
                  {formatToARS(totalPrice)}
                </span>
              </TableCell>
              <TableCell className="text-gray-400">
                {formatDate(createdAt)}
              </TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
}
