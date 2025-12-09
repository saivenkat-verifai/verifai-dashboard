// -----------------------------------------------------------------------------
// CalendarComponent (Angular + PrimeNG)
// -----------------------------------------------------------------------------

import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { OverlayPanelModule } from 'primeng/overlaypanel';

type DateRangePayload = {
  startDate: Date;
  startTime: string;
  endDate: Date;
  endTime: string;
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    CheckboxModule,
    RadioButtonModule,
    CalendarModule,
    ButtonModule,
    OverlayPanelModule,
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
})
export class CalendarComponent implements OnInit {
  // ---------------------------------------------------------------------------
  // Inputs / Outputs
  // ---------------------------------------------------------------------------
  @Input() showViewDropdown: boolean = true;
  @Input() variant: 'dashboard' | 'events' = 'events';

  @Output() dateRangeSelected = new EventEmitter<DateRangePayload>();

  private readonly autoEmit: boolean = false;

  // UI mode
  dateRange: boolean = true;
  wholeDay: boolean = false;
  mode: 'range' | 'whole' = 'range';

  // which input is currently “active” in the popup
  activeInput: 'start' | 'end' = 'start';
  inlineDate: Date = new Date();

// Generate full 24 hours in 30-min intervals
popularTimes: string[] = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

  viewMode: 'day' | 'week' | 'month' | 'custom' = 'day';
  viewOptions = [
    { label: 'DAY', value: 'day' },
    { label: 'WEEK', value: 'week' },
    { label: 'MONTH', value: 'month' },
  ];

  today: Date = new Date();
  currentMonth: Date = new Date();

  startDate: Date = new Date();
  endDate: Date = new Date();
  startTime: string = '00:00:00';
  endTime: string = '';

  private lastEmittedKey: string = '';

  // Month / Week models
  months: Array<{ label: string; start: Date; end: Date }> = [];
  currentMonthIndex: number = 0;
  monthWindowStartIndex: number = 0;

  weeks: Array<{ label: string; start: Date; end: Date; range: string }> = [];
  currentWeekIndex: number = 0;
  weekWindowStartIndex: number = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  ngOnInit() {
    this.today.setHours(23, 59, 59, 999);

    const currentYear = new Date().getFullYear();
    this.generateAllISOWeeks(currentYear - 5, currentYear + 5);
    this.generateMonths(currentYear - 5, currentYear + 5);

    // default seed: today 00:00 → now
    this.setTodayStartEndValues();

    // emit ONCE on load
    this.emitOnceOnInit();

    // set inline calendar date
    this.inlineDate = new Date(this.startDate);
  }

  // ---------------------------------------------------------------------------
  // EMIT HELPERS
  // ---------------------------------------------------------------------------
  private buildKey(): string {
    return `${this.startDate.getTime()}_${this.endDate.getTime()}_${this.startTime}_${this.endTime}`;
  }

  private emitOnceOnInit(): void {
    const key = this.buildKey();
    this.lastEmittedKey = key;
    this.dateRangeSelected.emit({
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
    });
  }

  private maybeEmit(): void {
    if (!this.autoEmit) return;
  }

  /** Force an emit now and refresh dedupe key */
  private forceEmit(): void {
    const key = this.buildKey();
    this.lastEmittedKey = key;
    this.dateRangeSelected.emit({
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
    });
  }

  // called by the red arrow Confirm button
  confirmSelection(op: any) {
    const now = new Date();

    if (this.wholeDay) {
      this.startTime = '00:00:00';

      const end = new Date(this.endDate);

      if (this.isSameDay(end, now)) {
        // today → clamp to now
        this.endDate = now;
        this.endTime = this.formatTime24(now);
      } else {
        // past day → full day
        end.setHours(23, 59, 59, 999);
        this.endDate = end;
        this.endTime = '23:59:59';
      }
    } else {
      this.endTime = this.formatTime24(this.endDate);

      // extra guard: never allow future end
      if (this.endDate > now) {
        this.endDate = now;
        this.endTime = this.formatTime24(now);
      }
    }

    const key = this.buildKey();
    if (key !== this.lastEmittedKey) {
      this.lastEmittedKey = key;
      this.dateRangeSelected.emit({
        startDate: this.startDate,
        startTime: this.startTime,
        endDate: this.endDate,
        endTime: this.endTime,
      });
    }
    op?.hide?.();
  }


  // ---------------------------------------------------------------------------
  // DATE / TIME UTIL
  // ---------------------------------------------------------------------------
  private isFutureDate(date: Date): boolean {
    return date > this.today;
  }

  private formatTime24(date: Date): string {
    return date.toTimeString().split(' ')[0];
  }

  private setTodayStartEndValues(): void {
    const now = new Date();
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );

    if (this.wholeDay) {
      this.startDate = dayStart;
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      this.endDate = dayEnd;
      this.startTime = '00:00:00';
      this.endTime = '23:59:59';
    } else {
      this.startDate = dayStart;
      this.endDate = now;
      this.startTime = '00:00:00';
      this.endTime = this.formatTime24(now);
    }
  }

  // ---------------------------------------------------------------------------
  // VIEW MODE (DAY/WEEK/MONTH)
  // ---------------------------------------------------------------------------
  onViewModeChange(mode: 'day' | 'week' | 'month' | 'custom') {
    this.viewMode = mode;

    if (mode === 'week') {
      this.setInitialWeekWindow();
      const currentWeek = this.weeks[this.currentWeekIndex];
      this.selectWeek(currentWeek);
      return;
    }

    if (mode === 'day') {
      this.setTodayStartEndValues();
      this.forceEmit();
      return;
    }

    if (mode === 'month') {
      const current =
        this.months[this.currentMonthIndex] ??
        this.months[this.months.length - 1];
      if (current) {
        this.selectMonth(current);
      }
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // MONTH MODEL / NAV
  // ---------------------------------------------------------------------------
  private generateMonths(startYear: number, endYear: number) {
    const months: Array<{ label: string; start: Date; end: Date }> = [];
    const today = new Date();
    const cMonth = today.getMonth();
    const cYear = today.getFullYear();

    for (let y = startYear; y <= endYear; y++) {
      for (let m = 0; m < 12; m++) {
        const start = new Date(y, m, 1, 0, 0, 0, 0);
        const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
        if (start > today) continue;

        let label = start.toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        });

        if (y === cYear && m === cMonth) label = 'This Month';
        else if (
          (y === cYear && m === cMonth - 1) ||
          (cMonth === 0 && y === cYear - 1 && m === 11)
        )
          label = 'Last Month';

        months.push({ label, start, end });
      }
    }

    this.months = months;
    const idx = months.findIndex((m) => today >= m.start && today <= m.end);
    this.currentMonthIndex = Math.max(0, idx);
    this.monthWindowStartIndex = Math.max(0, this.currentMonthIndex - 1);
    this.currentMonth = new Date(today);
  }

  visibleMonthWindow() {
    return this.months.slice(
      this.monthWindowStartIndex,
      this.monthWindowStartIndex + 3
    );
  }

  prevMonthWindow() {
    if (this.monthWindowStartIndex - 3 >= 0) {
      this.monthWindowStartIndex -= 3;
      this.currentMonthIndex = this.monthWindowStartIndex + 2;
      this.selectMonth(this.months[this.currentMonthIndex]);
    }
  }

  nextMonthWindow() {
    const nextIndex = this.monthWindowStartIndex + 3;
    const nextMonth = this.months[nextIndex + 2];
    if (
      nextMonth &&
      this.isFutureDate(nextMonth.start) &&
      nextMonth.label !== 'This Month'
    )
      return;

    if (nextIndex < this.months.length - 1) {
      this.monthWindowStartIndex += 3;
      this.currentMonthIndex = Math.min(
        this.monthWindowStartIndex + 2,
        this.months.length - 1
      );
      this.selectMonth(this.months[this.currentMonthIndex]);
    }
  }

  selectMonth(month: { label: string; start: Date; end: Date }) {
    this.currentMonthIndex = this.months.indexOf(month);
    const now = new Date();

    const isCurrent = month.start <= now && month.end >= now;
    this.startDate = new Date(month.start);
    this.startTime = '00:00:00';

    this.endDate = new Date(isCurrent ? now : month.end);
    this.endTime = isCurrent ? this.formatTime24(now) : '23:59:59';

    this.currentMonth = new Date(month.start);
    this.inlineDate = new Date(this.startDate);

    this.forceEmit();
  }

  get daysInMonth(): { date: Date | null; isFuture: boolean }[] {
    const y = this.currentMonth.getFullYear();
    const m = this.currentMonth.getMonth();

    const firstDay = new Date(y, m, 1).getDay();
    const leading = firstDay === 0 ? 6 : firstDay - 1;

    const days = new Date(y, m + 1, 0).getDate();
    const out: { date: Date | null; isFuture: boolean }[] = [];

    for (let i = 0; i < leading; i++)
      out.push({ date: null, isFuture: false });
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      out.push({ date, isFuture: date > this.today });
    }
    return out;
  }

  prevMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
  }

  nextMonth() {
    const next = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    if (this.isFutureDate(next)) return;
    this.currentMonth = next;
  }

  // ---------------------------------------------------------------------------
  // WEEK MODEL / NAV
  // ---------------------------------------------------------------------------
  private generateAllISOWeeks(startYear: number, endYear: number) {
    const weeks: Array<{
      label: string;
      start: Date;
      end: Date;
      range: string;
    }> = [];
    const today = new Date();
    const todayLocal = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const currentMonday = new Date(todayLocal);
    const dow = currentMonday.getDay();
    const backToMon = (dow + 6) % 7;
    currentMonday.setDate(currentMonday.getDate() - backToMon);
    currentMonday.setHours(0, 0, 0, 0);

    const lastWeekMonday = new Date(currentMonday);
    lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);

    for (let year = startYear; year <= endYear; year++) {
      let d = new Date(year, 0, 1);
      while (d.getDay() !== 1) d.setDate(d.getDate() + 1);

      while (d.getFullYear() <= year) {
        const start = new Date(d);
        const end = new Date(d);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        if (start <= todayLocal) {
          const startLabel = start.toLocaleString('default', {
            month: 'short',
            day: 'numeric',
          });
          const endLabel = end.toLocaleString('default', {
            month: 'short',
            day: 'numeric',
          });
          const sameMonth = start.getMonth() === end.getMonth();
          const range = sameMonth
            ? `${startLabel} - ${endLabel.split(' ')[1]}`
            : `${startLabel} - ${endLabel}`;

          let label = range;
          if (start.getTime() === currentMonday.getTime()) label = 'This Week';
          else if (start.getTime() === lastWeekMonday.getTime())
            label = 'Last Week';

          weeks.push({ label, start, end, range });
        }
        d.setDate(d.getDate() + 7);
      }
    }

    this.weeks = weeks;
    this.currentWeekIndex = weeks.findIndex(
      (w) => todayLocal >= w.start && todayLocal <= w.end
    );
    this.weekWindowStartIndex = Math.max(0, this.currentWeekIndex - 2);
  }

  private setInitialWeekWindow() {
    const now = new Date();
    this.currentWeekIndex = this.weeks.findIndex(
      (w) => now >= w.start && now <= w.end
    );
    this.weekWindowStartIndex = Math.max(0, this.currentWeekIndex - 2);
  }

  visibleWeekWindow() {
    return this.weeks.slice(
      this.weekWindowStartIndex,
      this.weekWindowStartIndex + 3
    );
  }

  prevWeekWindow() {
    if (this.weekWindowStartIndex - 3 >= 0) {
      this.weekWindowStartIndex -= 3;
      this.currentWeekIndex = this.weekWindowStartIndex + 2;
    }
  }

  nextWeekWindow() {
    const nextIndex = this.weekWindowStartIndex + 3;
    const nextWeek = this.weeks[nextIndex + 2];
    if (
      nextWeek &&
      this.isFutureDate(nextWeek.start) &&
      nextWeek.label !== 'This Week'
    )
      return;

    if (nextIndex < this.weeks.length - 1) {
      this.weekWindowStartIndex += 3;
      this.currentWeekIndex = Math.min(
        this.weekWindowStartIndex + 2,
        this.weeks.length - 1
      );
    }
  }

  selectWeek(week: {
    label: string;
    start: Date;
    end: Date;
    range: string;
  }) {
    this.currentWeekIndex = this.weeks.indexOf(week);

    const now = new Date();
    const isCurrent = week.start <= now && week.end >= now;

    this.startDate = new Date(week.start);
    this.startTime = '00:00:00';

    this.endDate = new Date(isCurrent ? now : week.end);
    this.endTime = isCurrent ? this.formatTime24(now) : '23:59:59';

    this.inlineDate = new Date(this.startDate);

    this.forceEmit();
  }

  get selectedWeekStart(): Date {
    return this.weeks[this.currentWeekIndex]?.start;
  }
  get selectedWeekEnd(): Date {
    return this.weeks[this.currentWeekIndex]?.end;
  }

  get canNavigatePrevWeek(): boolean {
    return true;
  }
  get canNavigatePrevMonth(): boolean {
    return true;
  }

  get canNavigateNextWeek(): boolean {
    const nextIndex = this.weekWindowStartIndex + 3;
    const nextWeek = this.weeks[nextIndex + 2];
    return nextWeek ? !this.isFutureDate(nextWeek.start) : false;
  }
  get canNavigateNextMonth(): boolean {
    const nextIndex = this.monthWindowStartIndex + 3;
    const nextMonth = this.months[nextIndex + 2];
    return nextMonth ? !this.isFutureDate(nextMonth.start) : false;
  }

  // ---------------------------------------------------------------------------
  // DAY NAVIGATION
  // ---------------------------------------------------------------------------
  get canNavigateNextDay(): boolean {
    const next = new Date(this.startDate);
    next.setDate(next.getDate() + 1);
    return !this.isFutureDate(next);
  }

  prevDay() {
    const d = new Date(this.startDate);
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);

    this.startDate = d;
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    this.endDate = end;

    this.startTime = '00:00:00';
    this.endTime = '23:59:59';
    this.currentMonth = new Date(d);
    this.inlineDate = new Date(this.startDate);

    this.forceEmit();
  }

  nextDay() {
    const next = new Date(this.startDate);
    next.setDate(next.getDate() + 1);
    if (this.isFutureDate(next)) return;

    next.setHours(0, 0, 0, 0);
    this.startDate = next;

    const end = new Date(next);
    end.setHours(23, 59, 59, 999);
    this.endDate = end;

    this.startTime = '00:00:00';
    this.endTime = '23:59:59';
    this.currentMonth = new Date(next);
    this.inlineDate = new Date(this.startDate);

    this.forceEmit();
  }

goToday() {
  const now = new Date();
  this.viewMode = 'day';
  this.currentMonth = new Date(now);

  // Start of today
  const dayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  // End of today (23:59:59)
  const dayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  this.startDate = dayStart;
  this.endDate = dayEnd;
  this.startTime = '00:00:00';
  this.endTime = '23:59:59';
  this.inlineDate = new Date(this.startDate);

  this.forceEmit();
}


  // ---------------------------------------------------------------------------
  // TOGGLES & POPUP HANDLERS
  // ---------------------------------------------------------------------------
  toggleDateRange() {
    this.mode = 'range';
    this.dateRange = true;
    this.wholeDay = false;
    this.setTodayStartEndValues();
  }

  toggleWholeDay() {
    this.mode = 'whole';
    this.wholeDay = true;
    this.dateRange = false;
    this.setTodayStartEndValues();
  }

  // inline calendar date selection
  onInlineDateSelect(date: Date) {
    if (this.isFutureDate(date)) return; // just in case

    if (this.activeInput === 'start') {
      const copy = new Date(this.startDate);
      copy.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      this.startDate = copy;
    } else {
      const copy = new Date(this.endDate);
      copy.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      this.endDate = copy;
    }
  }

    private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
    // Used by template to grey out future times
  isTimeDisabled(time: string): boolean {
    const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));
    const base =
      this.activeInput === 'start'
        ? new Date(this.startDate)
        : new Date(this.endDate);

    const candidate = new Date(base);
    candidate.setHours(hh, mm, 0, 0);

    const now = new Date();

    // If day is in the past → nothing disabled
    if (!this.isSameDay(candidate, now) && candidate < now) {
      return false;
    }

    // Same day → disable times after now
    if (this.isSameDay(candidate, now)) {
      return candidate > now;
    }

    // Future dates shouldn't be possible, but if so, everything is disabled
    return candidate > now;
  }


  // Popular time pill click (24h)
  // Popular time pill click (24h) – block future times
  onPopularTimeClick(time: string) {
    const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));

    const selectedBase =
      this.activeInput === 'start'
        ? new Date(this.startDate)
        : new Date(this.endDate);

    const candidate = new Date(selectedBase);
    candidate.setHours(hh, mm, 0, 0);

    const now = new Date();

    // If the selected day is in the past → always allowed
    if (!this.isSameDay(candidate, now) && candidate < now) {
      // past day (yesterday/earlier)
      if (this.activeInput === 'start') {
        this.startDate = candidate;
      } else {
        this.endDate = candidate;
      }
      return;
    }

    // Same day as today → allow only times <= now
    if (this.isSameDay(candidate, now)) {
      if (candidate > now) {
        return; // ⛔ future time today
      }
      if (this.activeInput === 'start') {
        this.startDate = candidate;
      } else {
        this.endDate = candidate;
      }
      return;
    }

    // Any other case (shouldn't happen if dates are limited) – still guard
    if (candidate > now) return;

    if (this.activeInput === 'start') this.startDate = candidate;
    else this.endDate = candidate;
  }

}
