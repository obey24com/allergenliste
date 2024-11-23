"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Product } from "@/types/product";
import { ALLERGENS, ADDITIVES } from "@/lib/constants";
import { ProductForm } from "@/components/product-form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProductTableProps {
  products: Product[];
  onDelete: (id: string) => void;
  onUpdate: (product: Product) => void;
  onReorder: (products: Product[]) => void;
}

interface SortableRowProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

function SortableRow({ product, onEdit, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? 'relative' : 'static',
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  } as React.CSSProperties;

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <Button 
          variant="ghost" 
          size="icon" 
          className="cursor-grab active:cursor-grabbing"
          {...attributes} 
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>
        {product.allergens
          .map((key) => ALLERGENS[key as keyof typeof ALLERGENS])
          .join(", ")}
      </TableCell>
      <TableCell>
        {product.additives
          .map((key) => ADDITIVES[key as keyof typeof ADDITIVES])
          .join(", ")}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(product)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(product.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ProductTable({ products, onDelete, onUpdate, onReorder }: ProductTableProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      onReorder(arrayMove(products, oldIndex, newIndex));
    }
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-md border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Allergene</TableHead>
                <TableHead>Zusatzstoffe</TableHead>
                <TableHead className="w-[120px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={products}
                strategy={verticalListSortingStrategy}
              >
                {products.map((product) => (
                  <SortableRow
                    key={product.id}
                    product={product}
                    onEdit={setEditingProduct}
                    onDelete={onDelete}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produkt bearbeiten</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              initialData={editingProduct}
              onSubmit={(updatedProduct) => {
                onUpdate(updatedProduct);
                setEditingProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
