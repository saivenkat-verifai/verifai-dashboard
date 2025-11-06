// -----------------------------------------------------------------------------
// CalendarComponent (Angular + PrimeNG)
// Purpose: Provide day/week/month selection with past-only navigation,
//          optional "Whole Day" vs "Date Range" picker,
//          ONE default API call on load (today 00:00 -> now),
//          left/right day arrows trigger an API call for the full day (00:00–23:59:59),
//          view selections (day/week/month) also emit,
//          and Confirm emits again ONLY if changed.
// -----------------------------------------------------------------------------

import { Component, EventEmitter, Output, OnInit, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DropdownModule } from "primeng/dropdown";
import { CheckboxModule } from "primeng/checkbox";
import { RadioButtonModule } from "primeng/radiobutton";
import { CalendarModule } from "primeng/calendar";
import { ButtonModule } from "primeng/button";
import { OverlayPanelModule } from "primeng/overlaypanel";

type DateRangePayload = {
  startDate: Date;
  startTime: string;
  endDate: Date;
  endTime: string;
};

@Component({
  selector: "app-calendar",
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
  templateUrl: "./calendar.component.html",
  styleUrls: ["./calendar.component.css"],
})
export class CalendarComponent implements OnInit {
  // Inputs / Outputs / Config
  @Input() showViewDropdown: boolean = true;
  @Output() dateRangeSelected = new EventEmitter<DateRangePayload>();

  private readonly autoEmit: boolean = false;

  dateRange: boolean = true;
  wholeDay: boolean = false;

  viewMode: "day" | "week" | "month" | "custom" = "day";
  viewOptions = [
    { label: "DAY", value: "day" },
    { label: "WEEK", value: "week" },
    { label: "MONTH", value: "month" },
  ];

  // Core State
  today: Date = new Date();
  currentMonth: Date = new Date();

  startDate: Date = new Date();
  endDate: Date = new Date();
  startTime: string = "00:00:00";
  endTime: string = "";

  private lastEmittedKey: string = "";

  // Month / Week Models
  months: Array<{ label: string; start: Date; end: Date }> = [];
  currentMonthIndex: number = 0;
  monthWindowStartIndex: number = 0;

  weeks: Array<{ label: string; start: Date; end: Date; range: string }> = [];
  currentWeekIndex: number = 0;
  weekWindowStartIndex: number = 0;

  // Lifecycle
  ngOnInit() {
    this.today.setHours(23, 59, 59, 999);

    const currentYear = new Date().getFullYear();
    this.generateAllISOWeeks(currentYear - 5, currentYear + 5);
    this.generateMonths(currentYear - 5, currentYear + 5);

    // default seed: today 00:00 → now
    this.setTodayStartEndValues();

    // emit ONCE on load
    this.emitOnceOnInit();
  }

  // Emission helpers
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
    // intentionally no-op in this build
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

  confirmSelection(op: any) {
    if (this.wholeDay) {
      this.startTime = "00:00:00";
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      this.endDate = end;
      this.endTime = "23:59:59";
    } else {
      this.endTime = this.formatTime24(this.endDate);
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

  // Date/Time utils
  private isFutureDate(date: Date): boolean {
    return date > this.today;
  }
  private formatTime24(date: Date): string {
    return date.toTimeString().split(" ")[0];
  }

  private setTodayStartEndValues(): void {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    if (this.wholeDay) {
      this.startDate = dayStart;
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      this.endDate = dayEnd;
      this.startTime = "00:00:00";
      this.endTime = "23:59:59";
    } else {
      this.startDate = dayStart;
      this.endDate = now;
      this.startTime = "00:00:00";
      this.endTime = this.formatTime24(now);
    }
  }

  formatLocalDateTime(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }
  parseLocalDateTime(datetime: string): Date {
    const d = new Date(datetime);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), 0, 0);
  }

  // View mode handling — now EMITS after seeding the range
  onViewModeChange(mode: "day" | "week" | "month" | "custom") {
    this.viewMode = mode;

    if (mode === "week") {
      this.setInitialWeekWindow();
      const currentWeek = this.weeks[this.currentWeekIndex];
      this.selectWeek(currentWeek); // selectWeek will emit
      return;
    }

    if (mode === "day") {
      // day mode defaults to today 00:00 → now
      this.setTodayStartEndValues();
      this.forceEmit(); // 🔴 emit on DAY select
      return;
    }

    if (mode === "month") {
      // pick "This Month" and emit
      const current = this.months[this.currentMonthIndex] ?? this.months[this.months.length - 1];
      if (current) {
        this.selectMonth(current); // selectMonth will emit
      }
      return;
    }
  }

  // Month window + nav (selectMonth now EMITS)
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

        let label = start.toLocaleString("default", { month: "long", year: "numeric" });
        if (y === cYear && m === cMonth) label = "This Month";
        else if ((y === cYear && m === cMonth - 1) || (cMonth === 0 && y === cYear - 1 && m === 11))
          label = "Last Month";

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
    return this.months.slice(this.monthWindowStartIndex, this.monthWindowStartIndex + 3);
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
    if (nextMonth && this.isFutureDate(nextMonth.start) && nextMonth.label !== "This Month") return;

    if (nextIndex < this.months.length - 1) {
      this.monthWindowStartIndex += 3;
      this.currentMonthIndex = Math.min(this.monthWindowStartIndex + 2, this.months.length - 1);
      this.selectMonth(this.months[this.currentMonthIndex]);
    }
  }

  /** 🔴 Now emits after selecting a month */
  selectMonth(month: { label: string; start: Date; end: Date }) {
    this.currentMonthIndex = this.months.indexOf(month);
    const now = new Date();

    const isCurrent = month.start <= now && month.end >= now;
    this.startDate = new Date(month.start);
    this.startTime = "00:00:00";

    this.endDate = new Date(isCurrent ? now : month.end);
    this.endTime = isCurrent ? this.formatTime24(now) : "23:59:59";

    this.currentMonth = new Date(month.start);

    this.forceEmit(); // 🔴 emit on MONTH select
  }

  get daysInMonth(): { date: Date | null; isFuture: boolean }[] {
    const y = this.currentMonth.getFullYear();
    const m = this.currentMonth.getMonth();

    const firstDay = new Date(y, m, 1).getDay();
    const leading = (firstDay === 0 ? 6 : firstDay - 1);

    const days = new Date(y, m + 1, 0).getDate();
    const out: { date: Date | null; isFuture: boolean }[] = [];

    for (let i = 0; i < leading; i++) out.push({ date: null, isFuture: false });
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      out.push({ date, isFuture: date > this.today });
    }
    return out;
  }

  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  }

  nextMonth() {
    const next = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    if (this.isFutureDate(next)) return;
    this.currentMonth = next;
  }

  // Week model + nav (selectWeek now EMITS)
  private generateAllISOWeeks(startYear: number, endYear: number) {
    const weeks: Array<{ label: string; start: Date; end: Date; range: string }> = [];
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

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
          const startLabel = start.toLocaleString("default", { month: "short", day: "numeric" });
          const endLabel = end.toLocaleString("default", { month: "short", day: "numeric" });
          const sameMonth = start.getMonth() === end.getMonth();
          const range = sameMonth ? `${startLabel} - ${endLabel.split(" ")[1]}` : `${startLabel} - ${endLabel}`;

          let label = range;
          if (start.getTime() === currentMonday.getTime()) label = "This Week";
          else if (start.getTime() === lastWeekMonday.getTime()) label = "Last Week";

          weeks.push({ label, start, end, range });
        }
        d.setDate(d.getDate() + 7);
      }
    }

    this.weeks = weeks;
    this.currentWeekIndex = weeks.findIndex(w => todayLocal >= w.start && todayLocal <= w.end);
    this.weekWindowStartIndex = Math.max(0, this.currentWeekIndex - 2);
  }

  private setInitialWeekWindow() {
    const now = new Date();
    this.currentWeekIndex = this.weeks.findIndex(w => now >= w.start && now <= w.end);
    this.weekWindowStartIndex = Math.max(0, this.currentWeekIndex - 2);
  }

  visibleWeekWindow() {
    return this.weeks.slice(this.weekWindowStartIndex, this.weekWindowStartIndex + 3);
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
    if (nextWeek && this.isFutureDate(nextWeek.start) && nextWeek.label !== "This Week") return;

    if (nextIndex < this.weeks.length - 1) {
      this.weekWindowStartIndex += 3;
      this.currentWeekIndex = Math.min(this.weekWindowStartIndex + 2, this.weeks.length - 1);
    }
  }

  /** 🔴 Now emits after selecting a week */
  selectWeek(week: { label: string; start: Date; end: Date; range: string }) {
    this.currentWeekIndex = this.weeks.indexOf(week);

    const now = new Date();
    const isCurrent = week.start <= now && week.end >= now;

    this.startDate = new Date(week.start);
    this.startTime = "00:00:00";

    this.endDate = new Date(isCurrent ? now : week.end);
    this.endTime = isCurrent ? this.formatTime24(now) : "23:59:59";

    this.forceEmit(); // 🔴 emit on WEEK select
  }

  get selectedWeekStart(): Date { return this.weeks[this.currentWeekIndex]?.start; }
  get selectedWeekEnd(): Date { return this.weeks[this.currentWeekIndex]?.end; }

  get canNavigatePrevWeek(): boolean { return true; }
  get canNavigatePrevMonth(): boolean { return true; }

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

  // Day navigation (arrows emit full-day; Today emits 00:00 → now)
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

    this.startTime = "00:00:00";
    this.endTime = "23:59:59";
    this.currentMonth = new Date(d);

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

    this.startTime = "00:00:00";
    this.endTime = "23:59:59";
    this.currentMonth = new Date(next);

    this.forceEmit();
  }

  /** TODAY → 00:00 to now and EMIT */
  goToday() {
    const now = new Date();
    this.viewMode = "day";
    this.currentMonth = new Date(now);

    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    this.startDate = dayStart;
    this.endDate = now;
    this.startTime = "00:00:00";
    this.endTime = this.formatTime24(now);

    this.forceEmit();
  }

  // Selection toggles / date picking
  toggleDateRange() {
    this.dateRange = true;
    this.wholeDay = false;
    this.setTodayStartEndValues();
  }

  toggleWholeDay() {
    this.wholeDay = true;
    this.dateRange = false;
    this.setTodayStartEndValues();
  }

  /**
   * Month day clicks:
   * - First click sets start only.
   * - Second click completes the range (start..end) and EMITS once.
   * - If you want single-date to emit immediately as a full day, uncomment the block.
   */
  selectDate(date: Date) {
    if (!this.startDate || (this.startDate && this.endDate)) {
      this.startDate = new Date(date);
      this.endDate = null as any;

      // // Uncomment if you want single-day immediate emit:
      // const end = new Date(date);
      // end.setHours(23, 59, 59, 999);
      // this.endDate = end;
      // this.startTime = "00:00:00";
      // this.endTime = "23:59:59";
      // this.forceEmit();
    } else {
      if (date >= this.startDate) this.endDate = new Date(date);
      else {
        const tmp = new Date(this.startDate);
        this.startDate = new Date(date);
        this.endDate = tmp;
      }
      // Normalize to full days and emit once the range is complete
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      this.endDate = end;
      this.startTime = "00:00:00";
      this.endTime = "23:59:59";
      this.forceEmit();
    }
  }

  isSelected(date: Date | null): boolean {
    if (!date) return false;
    if (this.startDate && !this.endDate) return date.toDateString() === this.startDate.toDateString();
    if (this.startDate && this.endDate) return date >= this.startDate && date <= this.endDate;
    return false;
  }

  // Optional: 21-day strip helper
  get visibleDays(): { date: Date | null }[] {
    const days: { date: Date | null }[] = [];
    const start = new Date(this.startDate);
    for (let i = 0; i < 21; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ date: d });
    }
    return days;
  }
}
