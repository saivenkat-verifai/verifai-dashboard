import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** 👉 Shared between EventsComponent and this panel */
export interface EventsFilterCriteria {
  startDate: string | null;
  startTime: string;
  endDate: string | null;
  endTime: string;
  minDuration: number | null;
  maxDuration: number | null;

  city: string;
  site: string;
  camera: string;
  actionTag: string;   // used mainly in CLOSED tab
  eventType: string;   // used as "Alert Type"
  employee: string;

  // 👉 Pending-only filters
  queueLevel: string;
  queueName: string;
  consoleType: string;
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
  @Input() sites: string[] = [];
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
    maxDuration: 120,
    city: 'All',
    site: 'All',
    camera: 'All',
    actionTag: 'All',
    eventType: 'All',
    employee: 'All',
    queueLevel: 'All',
    queueName: 'All',
    consoleType: 'All',
  };

  /** ------- Slider percentage helpers (0–120 mins) ------- */

  get minPercent(): number {
    const min = this.model.minDuration ?? 0;
    return (min / 120) * 100;
  }

  get maxPercent(): number {
    const max = this.model.maxDuration ?? 120;
    return (max / 120) * 100;
  }

  onMinDurationChange(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    if (this.model.maxDuration == null) {
      this.model.maxDuration = 120;
    }
    this.model.minDuration = Math.min(val, this.model.maxDuration);
  }

  onMaxDurationChange(event: Event): void {
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
    this.apply.emit(this.model);
  }

  onReset(): void {
    this.model = {
      startDate: null,
      startTime: '00:00',
      endDate: null,
      endTime: '23:59',
      minDuration: 0,
      maxDuration: 120,
      city: 'All',
      site: 'All',
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
