import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
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

interface CascaderProps {
  options: CascaderOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Cascader({
  options,
  value = [],
  onChange,
  placeholder = "请选择...",
  className,
  disabled = false,
}: CascaderProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState<string[]>(value);

  React.useEffect(() => {
    setSelectedValues(value);
  }, [value]);

  const handleSelect = (optionValue: string, level: number) => {
    const newValues = [...selectedValues];
    newValues[level] = optionValue;
    
    // 清除后续级别的选择
    for (let i = level + 1; i < newValues.length; i++) {
      newValues[i] = "";
    }
    
    setSelectedValues(newValues);
    onChange?.(newValues);
    
    // 如果没有子选项，关闭弹窗
    const currentOption = getOptionByPath(options, newValues.slice(0, level + 1));
    if (!currentOption?.children || currentOption.children.length === 0) {
      setOpen(false);
    }
  };

  const getOptionByPath = (opts: CascaderOption[], path: string[]): CascaderOption | null => {
    let current = opts;
    for (const pathValue of path) {
      const option = current.find(opt => opt.value === pathValue);
      if (!option) return null;
      if (!option.children) return option;
      current = option.children;
    }
    return null;
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
    
    // 如果路径太长，只显示最后两级
    if (labels.length > 2) {
      return `${labels[labels.length - 2]} / ${labels[labels.length - 1]}`;
    }
    
    return labels.join(" / ");
  };

  const renderLevel = (levelOptions: CascaderOption[], level: number) => {
    return (
      <div className="min-w-[140px] max-w-[200px] border-r border-border last:border-r-0">
        <div className="p-1">
          {levelOptions.map((option) => {
            const isSelected = selectedValues[level] === option.value;
            const hasChildren = option.children && option.children.length > 0;
            
            return (
              <div
                key={option.value}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleSelect(option.value, level)}
              >
                <span className="flex-1 truncate pr-2" title={option.label}>
                  {option.label}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isSelected && <Check className="h-3 w-3" />}
                  {hasChildren && <ChevronDown className="h-3 w-3 rotate-[-90deg]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCascaderContent = () => {
    const levels: React.ReactNode[] = [];
    let current = options;
    
    for (let i = 0; i < 3; i++) { // 最多3级
      if (current.length === 0) break;
      
      levels.push(renderLevel(current, i));
      
      // 获取下一级选项
      const selectedValue = selectedValues[i];
      if (selectedValue) {
        const selectedOption = current.find(opt => opt.value === selectedValue);
        if (selectedOption?.children) {
          current = selectedOption.children;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return (
      <div className="flex">
        {levels}
      </div>
    );
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
            !selectedValues.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate flex-1 text-left">
            {getDisplayText()}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-200" 
                       style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-lg border" 
        align="start"
        sideOffset={4}
      >
        <div className="max-h-[300px] overflow-hidden">
          {renderCascaderContent()}
        </div>
      </PopoverContent>
    </Popover>
  );
} 