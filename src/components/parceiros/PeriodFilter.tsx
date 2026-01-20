import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, X } from 'lucide-react';

export type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'last7days' | 'last30days' | 'custom';

interface PeriodFilterProps {
  value: PeriodFilter;
  onChange: (value: PeriodFilter) => void;
  customRange: { from: Date | undefined; to: Date | undefined };
  onCustomRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  className?: string;
  onClear?: () => void;
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
  className,
  onClear
}: PeriodFilterProps) => {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      onCustomRangeChange({
        from: date,
        to: customRange.to
      });
      onChange('custom');
      setStartOpen(false);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      onCustomRangeChange({
        from: customRange.from,
        to: date
      });
      onChange('custom');
      setEndOpen(false);
    }
  };

  const dateRange = getDateRangeFromPeriod(value, customRange);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Start Date Picker */}
      <Popover open={startOpen} onOpenChange={setStartOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="gap-2 min-w-[140px] justify-start"
          >
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {format(dateRange.start, 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background" align="start">
          <div className="p-2">
            <p className="text-xs text-muted-foreground mb-2 px-2">Data inicial</p>
            <Calendar
              mode="single"
              selected={customRange.from || dateRange.start}
              onSelect={handleStartDateSelect}
              locale={ptBR}
              showOutsideDays={false}
              className={cn("rounded-md pointer-events-auto")}
              modifiersClassNames={{
                today: ''
              }}
            />
          </div>
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">até</span>

      {/* End Date Picker */}
      <Popover open={endOpen} onOpenChange={setEndOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="gap-2 min-w-[140px] justify-start"
          >
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {format(dateRange.end, 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background" align="end">
          <div className="p-2">
            <p className="text-xs text-muted-foreground mb-2 px-2">Data final</p>
            <Calendar
              mode="single"
              selected={customRange.to || dateRange.end}
              onSelect={handleEndDateSelect}
              locale={ptBR}
              showOutsideDays={false}
              disabled={(date) => customRange.from ? date < customRange.from : false}
              className={cn("rounded-md pointer-events-auto")}
              modifiersClassNames={{
                today: ''
              }}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filter Button - Always visible */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="gap-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
        Limpar
      </Button>
    </div>
  );
};

export default PeriodFilterComponent;
