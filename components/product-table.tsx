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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardList,
  Copy,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Product } from "@/types/product";
import { ProductForm } from "@/components/product-form";
import {
  additiveLabelFromKey,
  allergenLabelFromKey,
  hasMissingDeclarations,
} from "@/lib/product-helpers";
import { ALLERGENS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ProductTableProps {
  products: Product[];
  onDelete: (id: string) => void;
  onUpdate: (product: Product) => void;
  onReorder: (products: Product[]) => void;
  onDuplicate: (product: Product) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkAddAllergen?: (ids: string[], allergenKey: string) => void;
  isReorderEnabled?: boolean;
}

interface SortableRowProps {
  product: Product;
  isSelected: boolean;
  isReorderEnabled: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onSelectionChange: (id: string, selected: boolean) => void;
}

interface SortableCardProps extends SortableRowProps {}

const NO_BULK_ALLERGEN = "__none__";

function SortableRow({
  product,
  isSelected,
  isReorderEnabled,
  onEdit,
  onDelete,
  onDuplicate,
  onSelectionChange,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: !isReorderEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? "relative" : "static",
    opacity: isDragging ? 0.5 : 1,
    touchAction: isReorderEnabled ? "none" : "auto",
  } as CSSProperties;
  const hasMissingData = hasMissingDeclarations(product.allergens, product.additives);

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(product.id, checked === true)}
          aria-label={`Produkt ${product.name} auswählen`}
        />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-grab active:cursor-grabbing disabled:cursor-not-allowed"
          disabled={!isReorderEnabled}
          aria-label={`Reihenfolge von ${product.name} ändern`}
          {...(isReorderEnabled ? attributes : {})}
          {...(isReorderEnabled ? listeners : {})}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{product.name}</span>
          {hasMissingData && (
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              Prüfen
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {product.allergens.length > 0 ? (
          product.allergens.map((key) => allergenLabelFromKey(key)).join(", ")
        ) : (
          <span className="text-muted-foreground">Keine Angabe</span>
        )}
      </TableCell>
      <TableCell>
        {product.additives.length > 0 ? (
          product.additives.map((key) => additiveLabelFromKey(key)).join(", ")
        ) : (
          <span className="text-muted-foreground">Keine Angabe</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(product)}
            aria-label={`Produkt ${product.name} bearbeiten`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDuplicate(product)}
            aria-label={`Produkt ${product.name} duplizieren`}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(product)}
            aria-label={`Produkt ${product.name} löschen`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SortableCard({
  product,
  isSelected,
  isReorderEnabled,
  onEdit,
  onDelete,
  onDuplicate,
  onSelectionChange,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: !isReorderEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? "relative" : "static",
    opacity: isDragging ? 0.6 : 1,
    touchAction: isReorderEnabled ? "none" : "auto",
  } as CSSProperties;

  const hasMissingData = hasMissingDeclarations(product.allergens, product.additives);

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(product.id, checked === true)}
              aria-label={`Produkt ${product.name} auswählen`}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed"
              disabled={!isReorderEnabled}
              aria-label={`Reihenfolge von ${product.name} ändern`}
              {...(isReorderEnabled ? attributes : {})}
              {...(isReorderEnabled ? listeners : {})}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(product)}
              aria-label={`Produkt ${product.name} bearbeiten`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDuplicate(product)}
              aria-label={`Produkt ${product.name} duplizieren`}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(product)}
              aria-label={`Produkt ${product.name} löschen`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="font-medium">{product.name}</p>
          {hasMissingData && (
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              Prüfen
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Allergene</p>
            <p className="mt-1">
              {product.allergens.length > 0 ? (
                product.allergens.map((key) => allergenLabelFromKey(key)).join(", ")
              ) : (
                <span className="text-muted-foreground">Keine Angabe</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Zusatzstoffe</p>
            <p className="mt-1">
              {product.additives.length > 0 ? (
                product.additives.map((key) => additiveLabelFromKey(key)).join(", ")
              ) : (
                <span className="text-muted-foreground">Keine Angabe</span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductTable({
  products,
  onDelete,
  onUpdate,
  onReorder,
  onDuplicate,
  onBulkDelete,
  onBulkAddAllergen,
  isReorderEnabled = true,
}: ProductTableProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [bulkAllergenKey, setBulkAllergenKey] = useState(NO_BULK_ALLERGEN);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateView = () => setIsMobileView(mediaQuery.matches);

    updateView();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateView);
      return () => mediaQuery.removeEventListener("change", updateView);
    }

    mediaQuery.addListener(updateView);
    return () => mediaQuery.removeListener(updateView);
  }, []);

  useEffect(() => {
    setSelectedProductIds((previous) => {
      const availableIds = new Set(products.map((product) => product.id));
      const next = new Set(Array.from(previous).filter((id) => availableIds.has(id)));
      const unchanged =
        next.size === previous.size && Array.from(next).every((id) => previous.has(id));
      return unchanged ? previous : next;
    });
  }, [products]);

  const selectedVisibleIds = useMemo(
    () => products.map((product) => product.id).filter((id) => selectedProductIds.has(id)),
    [products, selectedProductIds]
  );
  const hasSelection = selectedVisibleIds.length > 0;
  const allVisibleSelected = products.length > 0 && selectedVisibleIds.length === products.length;
  const selectAllState: boolean | "indeterminate" = allVisibleSelected
    ? true
    : hasSelection
      ? "indeterminate"
      : false;

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
    if (!isReorderEnabled) {
      return;
    }

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        onReorder(arrayMove(products, oldIndex, newIndex));
      }
    }
  };

  const handleSelectionChange = (id: string, selected: boolean) => {
    setSelectedProductIds((previous) => {
      const next = new Set(previous);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const shouldSelect = checked === true;
    setSelectedProductIds((previous) => {
      const next = new Set(previous);
      products.forEach((product) => {
        if (shouldSelect) {
          next.add(product.id);
        } else {
          next.delete(product.id);
        }
      });
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (!hasSelection) {
      return;
    }

    if (onBulkDelete) {
      onBulkDelete(selectedVisibleIds);
    } else {
      selectedVisibleIds.forEach((id) => onDelete(id));
    }

    setSelectedProductIds((previous) => {
      const next = new Set(previous);
      selectedVisibleIds.forEach((id) => next.delete(id));
      return next;
    });
    setIsBulkDeleteDialogOpen(false);
  };

  const handleBulkAllergenAssign = () => {
    if (!onBulkAddAllergen || !hasSelection || bulkAllergenKey === NO_BULK_ALLERGEN) {
      return;
    }

    onBulkAddAllergen(selectedVisibleIds, bulkAllergenKey);
    setBulkAllergenKey(NO_BULK_ALLERGEN);
  };

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
        <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 text-base font-semibold">Noch keine Produkte vorhanden</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fügen Sie Ihr erstes Produkt hinzu oder importieren Sie eine bestehende Liste.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {hasSelection && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
            <p className="text-sm font-medium">{selectedVisibleIds.length} ausgewählt</p>
            <Select value={bulkAllergenKey} onValueChange={setBulkAllergenKey}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue placeholder="Allergen zuweisen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_BULK_ALLERGEN}>Allergen wählen</SelectItem>
                {Object.entries(ALLERGENS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {key.toUpperCase()} - {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkAllergenAssign}
              disabled={!onBulkAddAllergen || bulkAllergenKey === NO_BULK_ALLERGEN}
            >
              Allergen zuweisen
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedProductIds(new Set())}>
              Auswahl aufheben
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteDialogOpen(true)}>
              Auswahl löschen
            </Button>
          </div>
        )}

        {!isReorderEnabled && (
          <p className="text-xs text-muted-foreground">
            Die Sortierung ist bei aktiven Filtern deaktiviert.
          </p>
        )}

        {isMobileView ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <p className="text-sm font-medium">Produkte</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectAllState}
                  onCheckedChange={handleSelectAll}
                  aria-label="Alle angezeigten Produkte auswählen"
                />
                <span className="text-xs text-muted-foreground">Alle</span>
              </div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={products.map((product) => product.id)}
                strategy={verticalListSortingStrategy}
              >
                {products.map((product) => (
                  <SortableCard
                    key={product.id}
                    product={product}
                    isSelected={selectedProductIds.has(product.id)}
                    isReorderEnabled={isReorderEnabled}
                    onEdit={setEditingProduct}
                    onDelete={setProductPendingDelete}
                    onDuplicate={onDuplicate}
                    onSelectionChange={handleSelectionChange}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]">
                      <Checkbox
                        checked={selectAllState}
                        onCheckedChange={handleSelectAll}
                        aria-label="Alle angezeigten Produkte auswählen"
                      />
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Allergene</TableHead>
                    <TableHead>Zusatzstoffe</TableHead>
                    <TableHead className="w-[170px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={products.map((product) => product.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {products.map((product) => (
                      <SortableRow
                        key={product.id}
                        product={product}
                        isSelected={selectedProductIds.has(product.id)}
                        isReorderEnabled={isReorderEnabled}
                        onEdit={setEditingProduct}
                        onDelete={setProductPendingDelete}
                        onDuplicate={onDuplicate}
                        onSelectionChange={handleSelectionChange}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>
        )}
      </div>

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produkt bearbeiten</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              initialData={editingProduct}
              existingProductNames={products
                .filter((product) => product.id !== editingProduct.id)
                .map((product) => product.name)}
              onSubmit={(updatedProduct) => {
                onUpdate(updatedProduct);
                setEditingProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!productPendingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setProductPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produkt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {productPendingDelete
                ? `Soll "${productPendingDelete.name}" wirklich gelöscht werden?`
                : "Soll dieses Produkt wirklich gelöscht werden?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productPendingDelete) {
                  onDelete(productPendingDelete.id);
                  setSelectedProductIds((previous) => {
                    const next = new Set(previous);
                    next.delete(productPendingDelete.id);
                    return next;
                  });
                }
                setProductPendingDelete(null);
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auswahl löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die ausgewählten Produkte wirklich löschen? Diese Aktion kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Auswahl löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
