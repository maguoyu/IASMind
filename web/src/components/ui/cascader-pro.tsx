import * as React from "react";
import { ChevronDown, Check, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export interface CascaderOption {
  value: string;
  label: string;
  children?: CascaderOption[];
}

interface CascaderProProps {
  options: CascaderOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showSearch?: boolean;
}

export function CascaderPro({
  options,
  value = [],
  onChange,
  placeholder = "请选择...",
  className,
  disabled = false,
}: CascaderProProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState<string[]>(value);

  React.useEffect(() => {
    setSelectedValues(value);
  }, [value]);

  const handleSelect = (optionValue: string, level: number) => {
    const newValues = [...selectedValues];
    newValues[level] = optionValue;
    
    // 清除后续级别的选择
    newValues.splice(level + 1);
    
    setSelectedValues(newValues);
    onChange?.(newValues);
    
    // 获取当前选项
    const currentOption = getOptionByPath(options, newValues);
    
    // 如果没有子选项，关闭弹窗
    if (!currentOption?.children || currentOption.children.length === 0) {
      setTimeout(() => setOpen(false), 100);
    }
  };

  const getOptionByPath = (opts: CascaderOption[], path: string[]): CascaderOption | null => {
    let current = opts;
    let lastOption: CascaderOption | null = null;
    
    for (const pathValue of path) {
      const option = current.find(opt => opt.value === pathValue);
      if (!option) return lastOption;
      
      lastOption = option;
      if (!option.children) return option;
      current = option.children;
    }
    
    return lastOption;
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0 || selectedValues.every(v => !v)) {
      return placeholder;
    }
    
    const labels: string[] = [];
    let current = options;
    
    for (const selectedValue of selectedValues) {
      if (!selectedValue) break;
      
      const option = current.find(opt => opt.value === selectedValue);
      if (!option) break;
      
      labels.push(option.label);
      if (!option.children) break;
      current = option.children;
    }
    
    // 智能显示：根据长度决定显示策略
    if (labels.length === 1) {
      return labels[0];
    } else if (labels.length === 2) {
      return labels.join(" / ");
    } else if (labels.length >= 3) {
      return `${labels[0]} / ... / ${labels[labels.length - 1]}`;
    }
    
    return labels.join(" / ");
  };

  const renderMenuItem = (option: CascaderOption, level: number, isLast: boolean) => {
    const isSelected = selectedValues[level] === option.value;
    const hasChildren = option.children && option.children.length > 0;
    
    return (
      <div
        key={option.value}
        className={cn(
          "flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors rounded-sm mx-1",
          "hover:bg-accent hover:text-accent-foreground",
          isSelected && "bg-primary/10 text-primary font-medium"
        )}
        onClick={() => handleSelect(option.value, level)}
      >
        <span className="flex-1 truncate pr-2" title={option.label}>
          {option.label}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isSelected && !hasChildren && <Check className="h-3.5 w-3.5 text-primary" />}
          {hasChildren && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>
    );
  };

  const renderLevel = (levelOptions: CascaderOption[], level: number) => {
    const isLastLevel = level === 2; // 最多显示3级
    
    return (
      <div className={cn(
        "min-w-[160px] max-w-[220px] border-r border-border/50 last:border-r-0",
        "max-h-[280px] overflow-y-auto"
      )}>
        <div className="py-1">
          {levelOptions.map((option) => 
            renderMenuItem(option, level, isLastLevel)
          )}
        </div>
      </div>
    );
  };

  const renderCascaderContent = () => {
    const levels: React.ReactNode[] = [];
    let current = options;
    
    // 总是显示第一级
    levels.push(renderLevel(current, 0));
    
    // 根据选择显示后续级别
    for (let i = 0; i < selectedValues.length && i < 2; i++) {
      const selectedValue = selectedValues[i];
      if (selectedValue) {
        const selectedOption = current.find(opt => opt.value === selectedValue);
        if (selectedOption?.children && selectedOption.children.length > 0) {
          current = selectedOption.children;
          levels.push(renderLevel(current, i + 1));
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return (
      <div className="flex bg-background">
        {levels}
      </div>
    );
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedValues([]);
    onChange?.([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-9 px-3 text-left font-normal",
            "hover:border-primary/50 focus:border-primary",
            !selectedValues.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate flex-1 text-left">
            {getDisplayText()}
          </span>
          <div className="flex items-center gap-1">
            {selectedValues.length > 0 && (
              <button
                className="hover:bg-muted rounded p-0.5 opacity-60 hover:opacity-100"
                onClick={handleClear}
              >
                <span className="text-xs">×</span>
              </button>
            )}
            <ChevronDown 
              className={cn(
                "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
                open && "rotate-180"
              )} 
            />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-lg border-0 bg-popover" 
        align="start"
        sideOffset={4}
      >
        <div className="rounded-md border bg-background shadow-md">
          {renderCascaderContent()}
        </div>
      </PopoverContent>
    </Popover>
  );
} 