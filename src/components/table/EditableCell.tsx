import { TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { CurrencyInput } from "../CurrencyInput";
import { formatToARS } from "@/lib/utils";

interface EditingCellProps {
  value: number | string;
  isEditing: boolean;
  onEdit: (value: string) => void;
  onStartEditing: (value: any) => void;
  isNumber?: boolean;
  price?: boolean;
}
const EditableCell: React.FC<EditingCellProps> = ({
  value,
  isEditing,
  onEdit,
  onStartEditing,
  price = false,
  isNumber = false,
}) => {
  return (
    <TableCell>
      {isEditing ? (
          <Input
            className="w-50"
            type={isNumber ? "number" : "text"}
            defaultValue={value}
            onBlur={(e) => onEdit(e.target.value)}
            autoFocus
          />
        
      ) : (
        <div className="flex items-center gap-2">
          {isNumber && price ? `${formatToARS(Number(value))}` : value}
          <Button variant="ghost" size="icon" onClick={onStartEditing}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      )}
    </TableCell>
  );
};

export default EditableCell;
