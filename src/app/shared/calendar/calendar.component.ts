import { Component, EventEmitter, Output, OnInit,Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DropdownModule } from "primeng/dropdown";
import { CheckboxModule } from "primeng/checkbox";
import { RadioButtonModule } from "primeng/radiobutton";
import { CalendarModule } from "primeng/calendar";
import { ButtonModule } from "primeng/button";
import { OverlayPanelModule } from "primeng/overlaypanel";

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
   @Input() showViewDropdown: boolean = true; // 👈 default true
  @Output() dateRangeSelected = new EventEmitter<{
    startDate: Date;
    startTime: string;
    endDate: Date;
    endTime: string;
  }>();

  dateRange: boolean = false;
  wholeday: boolean = false;

  viewMode: "day" | "week" | "month" | "custom" = "day";
  viewOptions = [
    { label: "DAY", value: "day" },
    { label: "WEEK", value: "week" },
    { label: "MONTH", value: "month" },
    // { label: "CUSTOM", value: "custom" },
  ];



  currentMonth: Date = new Date();
  today: Date = new Date();

  startDate: Date = new Date();
  endDate: Date = new Date();
  dateMode: string = "daterange";

  daterange: boolean = true;
  wholeDay: boolean = false;

  startTime: string = "00:00:00";
  endTime: string = "";

  months: any[] = [];
  currentMonthIndex: number = 0;
  monthWindowStartIndex: number = 0;

  visibleStartDate: Date = new Date();

  weeks: any[] = [];
  currentWeekIndex: number = 0;
  weekWindowStartIndex: number = 0;

 ngOnInit() {
  this.setTodayStartEndValues(); // ✅ already emits once

  const currentYear = new Date().getFullYear();
  this.generateAllISOWeeks(currentYear - 5, currentYear + 5);
  this.generateMonths(currentYear - 5, currentYear + 5);

  this.today.setHours(23, 59, 59, 999);



  // If week mode initialization is needed, keep this conditional
  if (this.viewMode === "week") {
    const currentWeek = this.weeks[this.currentWeekIndex];
    const now = new Date();
    const endDate = currentWeek.end >= now ? now : currentWeek.end;

    this.dateRangeSelected.emit({
      startDate: currentWeek.start,
      startTime: "00:00:00",
      endDate: endDate,
      endTime:
        endDate === now
          ? now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            
            })
          : "23:59:59",
    });
  }
}

  // ✅ Helper: prevent future navigation
  private isFutureDate(date: Date): boolean {
    return date > this.today;
  }

  visibleMonthWindow(): any[] {
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

  // ✅ Updated: Prevent navigating into future months
nextMonthWindow() {
  const nextIndex = this.monthWindowStartIndex + 3;
  const nextMonth = this.months[nextIndex + 2];

  // ✅ Allow navigating if the next month includes "today"
  if (
    nextMonth &&
    this.isFutureDate(nextMonth.start) &&
    nextMonth.label !== "This Month"
  ) {
    console.warn("Cannot move to a future month");
    return;
  }

  // ✅ Allow navigation up to "This Month"
  if (nextIndex < this.months.length - 1) {
    this.monthWindowStartIndex += 3;
    this.currentMonthIndex = Math.min(
      this.monthWindowStartIndex + 2,
      this.months.length - 1
    );
    this.selectMonth(this.months[this.currentMonthIndex]);
  }
}

  selectMonth(month: any) {
    this.currentMonthIndex = this.months.indexOf(month);

    const now = new Date();
    let endDate = month.end;

    if (month.start <= now && month.end >= now) {
      endDate = now;
    }

    this.dateRangeSelected.emit({
      startDate: month.start,
      startTime: "00:00:00",
      endDate: endDate,
      endTime:
        endDate === now
          ? now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              // hour12: true,
            })
          : "23:59:59",
    });
  }
generateMonths(startYear: number, endYear: number) {
  const months: any[] = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);

      // ✅ Skip future months entirely
      if (start > today) continue;

      let label = start.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      // ✅ Label current and previous months
      if (year === currentYear && month === currentMonth) {
        label = "This Month";
      } else if (
        (year === currentYear && month === currentMonth - 1) ||
        (currentMonth === 0 && year === currentYear - 1 && month === 11)
      ) {
        label = "Last Month";
      }

      months.push({ label, start, end });
    }
  }

  this.months = months;

  const todayMonthIndex = this.months.findIndex(
    (m) => today >= m.start && today <= m.end
  );

  this.currentMonthIndex = todayMonthIndex;
  this.monthWindowStartIndex = Math.max(0, this.currentMonthIndex - 1);
}


  onViewModeChange(mode: "day" | "week" | "month" | "custom") {
    this.viewMode = mode;

    if (mode === "week") {
      this.setInitialWeekWindow();
      const currentWeek = this.weeks[this.currentWeekIndex];
      this.selectWeek(currentWeek);
    } else if (mode === "day" || mode === "month") {
      this.setTodayStartEndValues();
      this.dateRangeSelected.emit({
        startDate: this.startDate,
        startTime: this.startTime,
        endDate: this.endDate,
        endTime: this.endTime,
      });
    }
  }

  get visibleDays(): { date: Date | null }[] {
    const days: { date: Date | null }[] = [];
    const start = new Date(this.visibleStartDate);

    for (let i = 0; i < 21; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push({ date: day });
    }

    return days;
  }

setInitialWeekWindow() {
  const now = new Date();
  this.currentWeekIndex = this.weeks.findIndex(
    (w) => now >= w.start && now <= w.end
  );

  // ✅ Make sure we start 1 window *before* This Week
  this.weekWindowStartIndex = Math.max(0, this.currentWeekIndex - 2);
}

generateAllISOWeeks(startYear: number, endYear: number) {
  const weeks: any[] = [];
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // normalized midnight local

  // Get current local Monday (start of week)
  const currentMonday = new Date(todayLocal);
  const dayOfWeek = currentMonday.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diffToMonday = (dayOfWeek + 6) % 7; // number of days to go back to Monday
  currentMonday.setDate(currentMonday.getDate() - diffToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const lastWeekMonday = new Date(currentMonday);
  lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);

  for (let year = startYear; year <= endYear; year++) {
    let d = new Date(year, 0, 1);

    // find first Monday of this year
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);

    while (d.getFullYear() <= year) {
      const weekStart = new Date(d);
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      if (weekStart <= todayLocal) {
        const startLabel = weekStart.toLocaleString("default", { month: "short", day: "numeric" });
        const endLabel = weekEnd.toLocaleString("default", { month: "short", day: "numeric" });
        const rangeLabel =
          weekStart.getMonth() === weekEnd.getMonth()
            ? `${startLabel} - ${endLabel.split(" ")[1]}`
            : `${startLabel} - ${endLabel}`;

        let label = rangeLabel;
        if (weekStart.getTime() === currentMonday.getTime()) label = "This Week";
        else if (weekStart.getTime() === lastWeekMonday.getTime()) label = "Last Week";

        weeks.push({ label, start: weekStart, end: weekEnd, range: rangeLabel });
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

  visibleWeekWindow(): any[] {
    return this.weeks.slice(
      this.weekWindowStartIndex,
      this.weekWindowStartIndex + 3
    );
  }

  prevWeekWindow() {
    if (this.weekWindowStartIndex - 3 >= 0) {
      this.weekWindowStartIndex -= 3;
      this.currentWeekIndex = this.weekWindowStartIndex + 2;
      console.log("Selected week:", this.weeks[this.currentWeekIndex]);
    }
  }

  // ✅ Updated: Prevent navigating into future weeks
nextWeekWindow() {
  const nextIndex = this.weekWindowStartIndex + 3;
  const nextWeek = this.weeks[nextIndex + 2];

  // ✅ Allow moving if the next week is "This Week" (current week)
  if (
    nextWeek &&
    this.isFutureDate(nextWeek.start) &&
    nextWeek.label !== "This Week"
  ) {
    console.warn("Cannot move to a future week");
    return;
  }

  // ✅ Allow moving until we actually reach the end of available weeks
  if (nextIndex < this.weeks.length - 1) {
    this.weekWindowStartIndex += 3;
    this.currentWeekIndex = Math.min(
      this.weekWindowStartIndex + 2,
      this.weeks.length - 1
    );
    console.log("Selected week:", this.weeks[this.currentWeekIndex]);
  }
}

// Check if next day is allowed
get canNavigateNextDay(): boolean {
  const next = new Date(this.startDate);
  next.setDate(next.getDate() + 1);
  return !this.isFutureDate(next);
}

// Check if next week is allowed
get canNavigateNextWeek(): boolean {
  const nextIndex = this.weekWindowStartIndex + 3;
  const nextWeek = this.weeks[nextIndex + 2];
  return nextWeek ? !this.isFutureDate(nextWeek.start) : false;
}

// Check if next month is allowed
get canNavigateNextMonth(): boolean {
  const nextIndex = this.monthWindowStartIndex + 3;
  const nextMonth = this.months[nextIndex + 2];
  return nextMonth ? !this.isFutureDate(nextMonth.start) : false;
}

// Check if previous navigation is allowed (past is always allowed unless you have a min date)
get canNavigatePrevDay(): boolean {
  return true; // Always true if no min date restriction
}
get canNavigatePrevWeek(): boolean {
  return true;
}
get canNavigatePrevMonth(): boolean {
  return true;
}


  selectWeek(week: any) {

    this.currentWeekIndex = this.weeks.indexOf(week);

    const now = new Date();
    let endDate = week.end;

    if (week.start <= now && week.end >= now) {
      endDate = now;
    }

    this.dateRangeSelected.emit({
      startDate: week.start,
      startTime: "00:00:00",
      endDate: endDate,
      endTime:
        endDate === now
          ? now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              // hour12: true,
            })
          : "23:59:59",
    });
  }

  get selectedWeekStart(): Date {
    return this.weeks[this.currentWeekIndex]?.start;
  }
  get selectedWeekEnd(): Date {
    return this.weeks[this.currentWeekIndex]?.end;
  }

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

  setTodayStartEndValues() {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );

    if (this.wholeDay) {
      const todayNoon = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        12,
        0,
        0
      );
      this.startDate = todayStart;
      this.endDate = todayNoon;
      this.startTime = "00:00:00 AM";
      this.endTime = "11:59:59 PM";
    } else if (this.dateRange) {
      this.startDate = todayStart;
      this.endDate = now;
      this.startTime = "00:00:00 AM";
      this.endTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        // hour12: true,
      });
    } else {
      this.startDate = todayStart;
      this.endDate = now;
      this.startTime = "00:00:00 AM";
      this.endTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        // hour12: true,
      });
    }

    this.emitDateRange();
  }

  emitDateRange() {
    this.dateRangeSelected.emit({
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
    });
  }

  confirmSelection(op: any) {
    this.startTime = this.wholeDay
      ? "00:00:00"
      : this.startDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          // hour12: true,
        });

    this.endTime = this.wholeDay
      ? "11:59 PM"
      : this.endDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          // hour12: true,
        });

    this.dateRangeSelected.emit({
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
    });

    op.hide();
  }

  get daysInMonth(): { date: Date | null; isFuture: boolean }[] {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();

    const calendar: { date: Date | null; isFuture: boolean }[] = [];

    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
      calendar.push({ date: null, isFuture: false });
    }

    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      calendar.push({ date, isFuture: date > this.today });
    }

    return calendar;
  }

  prevMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
  }

  // ✅ Updated: Prevent next day/month navigation into the future
  nextMonth() {
    const next = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    if (this.isFutureDate(next)) {
      console.warn("Cannot move to a future month");
      return;
    }
    this.currentMonth = next;
  }

  goToday() {
    const now = new Date();
    this.viewMode = "day";
    this.currentMonth = now;
    this.startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0
    );
    this.endDate = now;
    this.startTime = "00:00:00";
    this.endTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      // hour12: true,
    });
    this.dateRangeSelected.emit({
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
    });
  }

  prevDay() {
    this.startDate = new Date(this.startDate);
    this.startDate.setDate(this.startDate.getDate() - 1);
    this.startDate.setHours(0, 0, 0, 0);
    this.endDate = new Date(this.startDate);
    this.endDate.setHours(23, 59, 59, 999);
    this.currentMonth = new Date(this.startDate);
    this.startTime = "00:00:00 AM";
    this.endTime = "11:59:59 PM";
    this.dateRangeSelected.emit({
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
    });
  }

  // ✅ Updated: Prevent moving to a future day
  nextDay() {
    const next = new Date(this.startDate);
    next.setDate(next.getDate() + 1);

    if (this.isFutureDate(next)) {
      console.warn("Cannot navigate to a future date");
      return;
    }

    this.startDate = next;
    this.startDate.setHours(0, 0, 0, 0);
    this.endDate = new Date(this.startDate);
    this.endDate.setHours(23, 59, 59, 999);
    this.currentMonth = new Date(this.startDate);
    this.startTime = "00:00:00 AM";
    this.endTime = "11:59.59 PM";
    this.dateRangeSelected.emit({
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
    });
  }

  selectDate(date: Date) {
    if (!this.startDate || (this.startDate && this.endDate)) {
      this.startDate = date;
      this.endDate = null as any;
    } else {
      if (date >= this.startDate) {
        this.endDate = date;
      } else {
        this.endDate = this.startDate;
        this.startDate = date;
      }
    }
  }

  isSelected(date: Date | null): boolean {
    if (!date) return false;
    if (this.startDate && !this.endDate) {
      return date.toDateString() === this.startDate.toDateString();
    }
    if (this.startDate && this.endDate) {
      return date >= this.startDate && date <= this.endDate;
    }
    return false;
  }

  formatLocalDateTime(date: Date) {
    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    const hh = date.getHours().toString().padStart(2, "0");
    const min = date.getMinutes().toString().padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }


  parseLocalDateTime(datetime: string) {
    const date = new Date(datetime);
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    );
  }
}
