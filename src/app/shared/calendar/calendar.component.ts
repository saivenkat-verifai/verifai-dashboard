import { Component, EventEmitter, Output, OnInit } from "@angular/core";
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
  @Output() dateRangeSelected = new EventEmitter<{
    startDate: Date;
    startTime: string;
    endDate: Date;
    endTime: string;
  }>();

  dateRange: boolean = false; // Add property for checkbox
  wholeday: boolean = false; // Add property for checkbox

  viewMode: "day" | "week" | "month" | "custom" = "day";
  viewOptions = [
    { label: "DAY", value: "day" },
    { label: "WEEK", value: "week" },
    { label: "MONTH", value: "month" },
    { label: "CUSTOM", value: "custom" },
  ];

  currentMonth: Date = new Date();
  today: Date = new Date(); // ✅ Always system "now"

  startDate: Date = new Date();
  endDate: Date = new Date();
  dateMode: string = "daterange"; // Default value

  daterange: boolean = true;
  wholeDay: boolean = false;

  startTime: string = "00:00";
  endTime: string = "";

  months: any[] = []; // All months (e.g., 12 per year for multiple years)
currentMonthIndex: number = 0; // Index of selected month
monthWindowStartIndex: number = 0; // Start index of visible 3-month window

  visibleStartDate: Date = new Date(); // first day shown in 3-week view

  weeks: any[] = []; // All weeks of the year
  currentWeekIndex: number = 0; // Index of current week
  weekWindowStartIndex: number = 0; // Start index of visible 3-week window

  ngOnInit() {
  this.setTodayStartEndValues();

  const currentYear = new Date().getFullYear();
  this.generateAllISOWeeks(currentYear - 5, currentYear + 5); // multi-year support
  this.generateMonths(currentYear - 5, currentYear + 5);


  this.today.setHours(23, 59, 59, 999);

  // Emit default range
  this.dateRangeSelected.emit({
    startDate: this.startDate,
    startTime: this.startTime,
    endDate: this.endDate,
    endTime: this.endTime,
  });

  // if (this.viewMode === "week") {
  //   console.log("Visible weeks:", this.visibleWeekWindow());
  // }
  if (this.viewMode === 'week') {
  const currentWeek = this.weeks[this.currentWeekIndex];
  const now = new Date();
  const endDate = currentWeek.end >= now ? now : currentWeek.end;

  this.dateRangeSelected.emit({
    startDate: currentWeek.start,
    startTime: '00:00',
    endDate: endDate,
    endTime: endDate === now
      ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '23:59',
  });
}
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
    this.currentMonthIndex = this.monthWindowStartIndex + 2; // current at last card
    this.selectMonth(this.months[this.currentMonthIndex]);
  }
}

nextMonthWindow() {
  if (this.monthWindowStartIndex + 3 + 2 < this.months.length) {
    this.monthWindowStartIndex += 3;
    this.currentMonthIndex = this.monthWindowStartIndex + 2;
    this.selectMonth(this.months[this.currentMonthIndex]);
  }
}

selectMonth(month: any) {
  this.currentMonthIndex = this.months.indexOf(month);

  const now = new Date();
  let endDate = month.end;

  // If current month, set endDate to today
  if (month.start <= now && month.end >= now) {
    endDate = now;
  }

  this.dateRangeSelected.emit({
    startDate: month.start,
    startTime: "00:00",
    endDate: endDate,
    endTime: endDate === now
      ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
      : "23:59",
  });
}

generateMonths(startYear: number, endYear: number) {
  const months: any[] = [];
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59); // last day of month
      months.push({
        label: start.toLocaleString("default", { month: "long", year: "numeric" }),
        start,
        end,
      });
    }
  }

  this.months = months;

  const today = new Date();
  this.currentMonthIndex = this.months.findIndex(
    (m) => today >= m.start && today <= m.end
  );

  // Show previous + current + next month as default window
  this.monthWindowStartIndex = Math.max(0, this.currentMonthIndex - 1);
}

onViewModeChange(mode: "day" | "week" | "month" | "custom") {
  this.viewMode = mode;

  if (mode === "week") {
    // Set current week
    this.setInitialWeekWindow();
    // Emit selected week immediately
    const currentWeek = this.weeks[this.currentWeekIndex];
    this.selectWeek(currentWeek);
  } else if (mode === "day" || mode === "month") {
    // Optional: emit day/month range if needed
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
      // 3 weeks = 21 days
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push({ date: day });
    }

    return days;
  }

  setInitialWeekWindow() {
    // Find current week index
    const now = new Date();
    this.currentWeekIndex = this.weeks.findIndex((w) => {
      return now >= w.start && now <= w.end;
    });

    // Make sure window start index is valid
    this.weekWindowStartIndex = Math.max(0, this.currentWeekIndex - 1);
    // So current week appears as middle card if possible
  }


  // -------------------- ISO Week Generation --------------------
generateAllISOWeeks(startYear: number, endYear: number) {
  const weeks: any[] = [];

  for (let year = startYear; year <= endYear; year++) {
    let d = new Date(year, 0, 4); // Jan 4th is always in Week 1
    let weekNumber = 1;

    // find Monday of the first ISO week
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));

    while (d.getFullYear() < year + 1 || (d.getFullYear() === year + 1 && d.getMonth() === 0 && weekNumber <= 52)) {
      const weekStart = new Date(d); // Monday
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      // Only include past & current weeks
      const today = new Date();
      if (weekStart <= today) {
        weeks.push({
          label: `Week ${weekNumber.toString().padStart(2, "0")}, ${weekStart.getFullYear()}`,
          start: new Date(weekStart),
          end: new Date(weekEnd),
        });
      }

      d.setDate(d.getDate() + 7);
      weekNumber++;
    }
  }

  this.weeks = weeks;

  // Auto-select current week
  const today = new Date();
  this.currentWeekIndex = this.weeks.findIndex(
    (w) => today >= w.start && today <= w.end
  );

  // Show last 2 weeks + current week
  this.weekWindowStartIndex = Math.max(0, this.currentWeekIndex - 2);

  console.log("Selected week:", this.weeks[this.currentWeekIndex]);
}

// -------------------- Visible 3-week window --------------------
visibleWeekWindow(): any[] {
  return this.weeks.slice(
    this.weekWindowStartIndex,
    this.weekWindowStartIndex + 3
  );
}

// -------------------- Navigate window --------------------
prevWeekWindow() {
  if (this.weekWindowStartIndex - 3 >= 0) {
    this.weekWindowStartIndex -= 3;
    this.currentWeekIndex = this.weekWindowStartIndex + 2; // current week at last card
    console.log("Selected week:", this.weeks[this.currentWeekIndex]);
  }
}

nextWeekWindow() {
  if (this.weekWindowStartIndex + 3 + 2 < this.weeks.length) {
    this.weekWindowStartIndex += 3;
    this.currentWeekIndex = this.weekWindowStartIndex + 2;
    console.log("Selected week:", this.weeks[this.currentWeekIndex]);
  }
}

// -------------------- Select week manually --------------------
selectWeek(week: any) {
  this.currentWeekIndex = this.weeks.indexOf(week);

  const now = new Date();
  let endDate = week.end;

  // If current week, set endDate to now
  if (week.start <= now && week.end >= now) {
    endDate = now;
  }

  this.dateRangeSelected.emit({
    startDate: week.start,
    startTime: "00:00",
    endDate: endDate,
    endTime: endDate === now
      ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
      : "23:59",
  });
}



  // -------------------- Optional helper for calendar popup --------------------
  get selectedWeekStart(): Date {
    return this.weeks[this.currentWeekIndex]?.start;
  }
  get selectedWeekEnd(): Date {
    return this.weeks[this.currentWeekIndex]?.end;
  }

  toggleDateRange() {
    if (this.daterange) {
      this.wholeDay = false;
    }
    this.setTodayStartEndValues();
  }

  toggleWholeDay() {
    if (this.wholeDay) {
      this.daterange = false;
    }
    this.setTodayStartEndValues();
  }

  setTodayStartEndValues() {
    const now = new Date(); // ✅ Current time
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0
    );

    if (this.wholeDay) {
      this.startDate = todayStart;
      this.endDate = now;
      this.startTime = "00:00";
      this.endTime = "11:59 PM"; // End of day in 12-hour format
    } else {
      this.startDate = todayStart;
      this.endDate = now;
      this.startTime = "00:00";
      this.endTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  confirmSelection(op: any) {
    this.startTime = this.wholeDay
      ? "00:00"
      : this.startDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

    this.endTime = this.wholeDay
      ? "11:59 PM"
      : this.endDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

    this.dateRangeSelected.emit({
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
    });

    // ✅ Close popup
    op.hide();
  }

  // Retained custom calendar methods
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

  nextMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
  }

goToday() {
  const now = new Date(); // ✅ Current time

  // 1️⃣ Reset view mode to 'day'
  this.viewMode = "day";

  // Optional: if you want the dropdown to reflect the change
  // (ngModel binding will take care of this)
  // this.viewMode is already bound to ngModel of <p-dropdown>

  // 2️⃣ Set current month to today
  this.currentMonth = now;

  // 3️⃣ Set startDate and endDate for today
  this.startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0
  );
  this.endDate = now;

  this.startTime = "00:00";
  this.endTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // 4️⃣ Emit the new date range
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

  formatLocalDate(date: Date) {
    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  get todayDate(): string {
    const now = new Date(); // ✅ Current time
    return `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  }
}
