import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function LoadingState({
  label = "Carregando...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-10 text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function TableSkeleton({
  columns = 6,
  rows = 5,
  headers,
}: {
  columns?: number;
  rows?: number;
  headers?: string[];
}) {
  const cols = headers ? headers.length : columns;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: cols }).map((_, i) => (
            <TableHead key={i}>
              {headers ? (
                headers[i]
              ) : (
                <Skeleton className="h-3 w-20" />
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <TableCell key={c}>
                <Skeleton className="h-3.5 w-full max-w-[160px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
