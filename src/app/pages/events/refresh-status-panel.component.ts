import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-refresh-status-panel",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:12px;">Refresh:</span>

      <select
        [value]="interval"
        (change)="onChange($event)"
        style="height:24px;"
      >
        <option [value]="1">1 min</option>
        <option [value]="2">2 min</option>
        <option [value]="5">5 min</option>
        <option [value]="10">10 min</option>
      </select>
    </div>
  `,
})
export class RefreshStatusPanelComponent {
  private params: any;
  interval = 1;

  agInit(params: any): void {
    this.params = params;
    this.interval = Number(params.getInterval?.() ?? 1);
  }

  refresh(params: any): boolean {
    this.params = params;
    this.interval = Number(params.getInterval?.() ?? 1);
    return true;
  }

  onChange(ev: Event) {
    const v = Number((ev.target as HTMLSelectElement).value);
    this.interval = v;
    console.log("Status bar dropdown selected:", v);
    this.params?.onIntervalChange?.(v);
  }
}
