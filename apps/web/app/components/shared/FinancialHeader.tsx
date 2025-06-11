import React from "react";
import { Button } from "@repo/ui/button";

interface FinancialHeaderProps {
  title: string;
  description: string;
  itemType: "income" | "expense";
  onAddClick: () => void;
  onBulkImportClick: () => void;
  onExportClick: () => void;
  onAddCategoryClick: () => void;
  hasItemsToExport: boolean;
}

export function FinancialHeader({
  title,
  description,
  itemType,
  onAddClick,
  onBulkImportClick,
  onExportClick,
  onAddCategoryClick,
  hasItemsToExport,
}: FinancialHeaderProps) {
  const addButtonText = `Add ${itemType === "income" ? "Income" : "Expense"}`;

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>
      <div className="flex space-x-3">
        <Button onClick={onAddClick}>
          {addButtonText}
        </Button>
        <Button onClick={onBulkImportClick}>
            Import CSV
        </Button>
        {hasItemsToExport && (
          <Button onClick={onExportClick}>
            Export CSV
          </Button>
        )}
        <Button onClick={onAddCategoryClick}>
          Add Category
        </Button>
      </div>
    </div>
  );
} 