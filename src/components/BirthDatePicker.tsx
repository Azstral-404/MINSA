import { useState, useEffect } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { buildISODate } from '@/lib/utils';

export function BirthDatePicker({ form, setField }: any) {
  // ---- Parse existing value -------------------------------------------------
  const initial = form.tanggalLahir
    ? new Date(form.tanggalLahir + 'T00:00:00')
    : undefined;

  // Separate state for year, month, and day
  const [year, setYear] = useState<number | undefined>(initial?.getFullYear());
  const [month, setMonth] = useState<number | undefined>(initial?.getMonth());
  const [day, setDay] = useState<number | undefined>(initial?.getDate());

  // When year or month changes, if day is out of range, reset day to last valid day
  useEffect(() => {
    if (year != null && month != null && day != null) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      if (day > daysInMonth) {
        setDay(daysInMonth);
      }
    }
    // Only run when year/month changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // Update tanggalLahir when all parts are set
  useEffect(() => {
    const iso = buildISODate(year, month, day);
    setField('tanggalLahir', iso ?? '');
  }, [year, month, day, setField]);

  // ---- Generate options ------------------------------------------------------
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i);
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const daysInMonth = month != null && year != null
    ? new Date(year, month + 1, 0).getDate()
    : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {form.tanggalLahir
            ? new Date(form.tanggalLahir).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Pilih tanggal'}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-4" align="start">
        {/* ---- Year selector ---- */}
        <Select value={year?.toString() ?? ''} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="mb-2">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ---- Month selector ---- */}
        <Select value={month?.toString() ?? ''} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="mb-2">
            <SelectValue placeholder="Bulan" />
          </SelectTrigger>
          <SelectContent>
            {months.map((name, idx) => (
              <SelectItem key={idx} value={idx.toString()}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ---- Day selector ---- */}
        <Select value={day?.toString() ?? ''} onValueChange={(v) => setDay(Number(v))}>
          <SelectTrigger className="mb-2">
            <SelectValue placeholder="Tanggal" />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={d.toString()}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  );
}