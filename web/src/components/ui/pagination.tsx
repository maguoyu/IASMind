import React from "react";
import { Button } from "./button";
import { Input } from "./input";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "~/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageInfo?: boolean;
  showPageSize?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  totalItems?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageInfo = true,
  showPageSize = false,
  pageSize = 20,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  totalItems,
}: PaginationProps) {
  const GetVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const HandlePageJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const targetPage = parseInt(e.currentTarget.value);
      if (targetPage >= 1 && targetPage <= totalPages) {
        onPageChange(targetPage);
      }
    }
  };

  // 始终显示分页信息，即使只有一页

  return (
    <div className="flex items-center justify-between space-x-2 py-4">
      {showPageInfo && (
        <div className="text-sm text-muted-foreground">
          第 {currentPage} 页，共 {totalPages} 页{totalItems ? `，总计 ${totalItems} 个文件` : ''}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 -ml-2" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center space-x-1">
            {GetVisiblePages().map((page, index) => (
              <React.Fragment key={index}>
                {page === "..." ? (
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className={cn(
                      "h-8 w-8 p-0",
                      currentPage === page && "bg-primary text-primary-foreground"
                    )}
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4 -ml-2" />
          </Button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">条</span>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">跳转到</span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            className="h-8 w-16"
            onKeyPress={HandlePageJump}
            placeholder={currentPage.toString()}
          />
          <span className="text-sm text-muted-foreground">页</span>
        </div>
      </div>
    </div>
  );
} 