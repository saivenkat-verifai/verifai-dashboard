import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DetailedViewItem } from '../../../../core/models/invsites.models';
import { SiteInventoryDetailedItem } from '../../../../core/models/inventory.models';

@Component({
  selector: 'app-invsites-detailed-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invsites-detailed-view.component.html',
  styleUrls: ['./invsites-detailed-view.component.css']
})
export class InvsitesDetailedViewComponent implements OnInit, OnChanges {
  @Input() tableData: SiteInventoryDetailedItem[] = [];

  detailedViewData: DetailedViewItem[] = [];

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tableData']) {
      this.groupData();
    }
  }

  groupData() {
    const grouped = new Map<string, DetailedViewItem>();

    (this.tableData || []).forEach(item => {
      const key = `${item.activityDate}_${item.action}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          date: item.activityDate,
          status: (item.action.charAt(0).toUpperCase() + item.action.slice(1).toLowerCase()) as 'Issued' | 'Returned',
          items: []
        });
      }

      const group = grouped.get(key)!;
      group.items.push({
        sNo: group.items.length + 1,
        itemProductName: item.name,
        totalQty: item.quantity,
        store: 0,
        online: 0,
        units: "No's"
      });
    });

    this.detailedViewData = Array.from(grouped.values()).sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }
}
