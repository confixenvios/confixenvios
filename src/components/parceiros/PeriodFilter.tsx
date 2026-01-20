import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronDown } from 'lucide-react';

export type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'last7days' | 'last30days' | 'custom';

interface PeriodFilterProps {
  value: PeriodFilter;
  onChange: (value: PeriodFilter) => void;
  customRange: { from: Date | undefined; to: Date | undefined };
  onCustomRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  className?: string;
}

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7days', label: 'Últimos 7 dias' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
  { value: 'last30days', label: 'Últimos 30 dias' },
  { value: 'lastMonth', label: 'Mês Passado' },
];

export const getDateRangeFromPeriod = (
  period: PeriodFilter,
  customRange: { from: Date | undefined; to: Date | undefined }
): { start: Date; end: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { start: today, end: now };
    case 'yesterday': {
      const yesterday = subDays(today, 1);
      return { start: yesterday, end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59) };
    }
    case 'last7days':
      return { start: subDays(today, 6), end: now };
    case 'week':
      return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last30days':
      return { start: subDays(today, 29), end: now };
    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case 'custom':
      return {
        start: customRange.from || startOfMonth(now),
        end: customRange.to || endOfMonth(now)
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

export const getPeriodLabel = (
  period: PeriodFilter,
  customRange: { from: Date | undefined; to: Date | undefined }
): string => {
  if (period === 'custom' && customRange.from && customRange.to) {
    return `${format(customRange.from, 'dd/MM/yy')} - ${format(customRange.to, 'dd/MM/yy')}`;
  }
  const option = periodOptions.find(o => o.value === period);
  return option?.label || 'Este Mês';
};

const PeriodFilterComponent = ({
  value,
  onChange,
  customRange,
  onCustomRangeChange,
  className
}: PeriodFilterProps) => {
  const [open, setOpen] = useState(false);

  const handlePeriodSelect = (period: PeriodFilter) => {
    onChange(period);
    if (period !== 'custom') {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("gap-2 min-w-[180px] justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-medium">{getPeriodLabel(value, customRange)}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Quick select options */}
          <div className="border-r p-2 min-w-[140px]">
            <div className="space-y-1">
              {periodOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={value === option.value ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => handlePeriodSelect(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Calendar for custom range */}
          <div className="p-2">
            <p className="text-xs text-muted-foreground mb-2 px-2">Período personalizado</p>
            <Calendar
              mode="range"
              selected={{
                from: customRange.from,
                to: customRange.to
              }}
              onSelect={(range) => {
                onCustomRangeChange({
                  from: range?.from,
                  to: range?.to
                });
                if (range?.from && range?.to) {
                  onChange('custom');
                  setOpen(false);
                }
              }}
              locale={ptBR}
              numberOfMonths={1}
              className={cn("rounded-md pointer-events-auto")}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PeriodFilterComponent;
