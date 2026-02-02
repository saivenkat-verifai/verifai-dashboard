import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventsService } from 'src/app/pages/events/events.service';

/** 👉 Shared between EventsComponent and this panel */
export interface EventsFilterCriteria {
  startDate: string | null;
  startTime: string;
  endDate: string | null;
  endTime: string;
  minDuration: number | null;
  maxDuration: number | null;

  city: string;
  timeZone: Timezoneoption | null,
  site: SiteOption | null;

  camera: string;
  actionTag: string;   // used mainly in CLOSED tab
  eventType: string;   // used as "Alert Type"
  employee: string;
  userLevels: string;

  // 👉 Pending-only filters
  queueLevel: string;
  queueName: string;
  consoleType: string;
}

export interface SiteOption {
  siteId: number;
  site: string;
}

export interface Timezoneoption {
  timezoneCode: string;
  timezoneValue: string;
}


@Component({
  selector: 'app-events-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events-filter-panel.component.html',
  styleUrls: ['./events-filter-panel.component.css'],
})
export class EventsFilterPanelComponent {
  @Input() showDateRange = true;

  @Input() cities: string[] = [];
  @Input() sites: any[] = [];
  @Input() cameras: string[] = [];
  @Input() actionTags: string[] = [];
  @Input() eventTypes: string[] = [];
  @Input() employees: string[] = [];

  @Input() queueLevels: string[] = [];
  @Input() queues: string[] = [];

  @Input() consoleTypes: string[] = [];

  /** PENDING tab toggles */
  @Input() consolesChecked = true;
  @Input() queuesChecked = false;

  /** current filter from parent */
  @Input() set filter(value: EventsFilterCriteria | null) {
    if (value) {
      this.model = { ...value };
    }
  }

  @Output() criteriaChange = new EventEmitter<EventsFilterCriteria>();


  @Output() close = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() apply = new EventEmitter<EventsFilterCriteria>();

  @Output() consolesToggle = new EventEmitter<void>();
  @Output() queuesToggle = new EventEmitter<void>();

  /** Local working model */
  model: EventsFilterCriteria = {
    startDate: null,
    startTime: '00:00',
    endDate: null,
    endTime: '23:59',
    minDuration: 0,
    maxDuration: 1440,
    userLevels: 'All',
    city: 'All',
    timeZone: null,
    site: null,
    camera: 'All',
    actionTag: 'All',
    eventType: 'All',
    employee: 'All',
    queueLevel: 'All',
    queueName: 'All',
    consoleType: 'All',
  };

  constructor(private eventService: EventsService) {

  }
today: any;
  ngOnInit() {
    this.onReset();
    this.timezoneDropdown();
    this.today = new Date().toISOString().split('T')[0];
  }



  timezones: any;
  timezoneDropdown() {
    this.eventService.timezoneDropdown().subscribe((res: any) => {
      this.timezones = res.timezones;

    })
  }

  compareSites = (a: any, b: any): boolean => {
    return a && b ? a.siteId === b.siteId : a === b;
  };

  compareTimezones = (a: any, b: any): boolean => {
    return a && b ? a.timezoneValue === b.timezoneValue : a === b;
  };

  onCriteriaChanged(): void {
    this.criteriaChange.emit({ ...this.model });
  }

  /** ------- Slider percentage helpers (0–1440 mins) ------- */

  get minPercent(): number {
    const min = this.model.minDuration ?? 0;
    return (min / 1440) * 100;
  }

  get maxPercent(): number {
    const max = this.model.maxDuration ?? 1440;
    return (max / 1440) * 100;
  }

  isDurationTouched = false;
  onMinDurationChange(event: Event): void {
    this.isDurationTouched = true;
    const val = +(event.target as HTMLInputElement).value;
    if (this.model.maxDuration == null) {
      this.model.maxDuration = 1440;
    }
    this.model.minDuration = Math.min(val, this.model.maxDuration);
  }

  onMaxDurationChange(event: Event): void {
    this.isDurationTouched = true;
    const val = +(event.target as HTMLInputElement).value;
    if (this.model.minDuration == null) {
      this.model.minDuration = 0;
    }
    this.model.maxDuration = Math.max(val, this.model.minDuration);
  }

  formatDuration(value: number | null): string {
    const m = Math.round(value ?? 0);
    const mm = m.toString().padStart(2, '0');
    return `${mm}:00`;
  }

  /** -------------------- UI events -------------------- */

  onClose(): void {
    this.close.emit();
  }

  onApply(): void {
    if (!this.isDurationTouched) {
      this.model.minDuration = null;
      this.model.maxDuration = null;
    }
    this.apply.emit(this.model);
  }

  onReset() {
    this.model = {
      startDate: null,
      startTime: '00:00',
      endDate: null,
      endTime: '23:59',
      minDuration: 0,
      maxDuration: 1440,
      userLevels: 'All',
      city: 'All',
      timeZone: null,
      site: null,
      camera: 'All',
      actionTag: 'All',
      eventType: 'All',
      employee: 'All',
      queueLevel: 'All',
      queueName: 'All',
      consoleType: 'All',
    };
    this.reset.emit();
  }

  onConsolesToggle(): void {
    this.consolesToggle.emit();
  }

  onQueuesToggle(): void {
    this.queuesToggle.emit();
  }
}
