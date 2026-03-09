import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvsitesListViewComponent } from './components/invsites-list-view/invsites-list-view.component';
import { InvsitesDetailedViewComponent } from './components/invsites-detailed-view/invsites-detailed-view.component';
import { SiteItem } from '../../core/models/invsites.models';
import { InventoryService } from '../../core/services/inventory.service';
import { SiteInventoryNormalItem, SiteInventoryDetailedItem } from '../../core/models/inventory.models';

import { UnifiedFilterPanelComponent, FilterField } from '../../shared/unified-filter-panel/unified-filter-panel.component';

@Component({
  selector: 'app-invsites',
  standalone: true,
  imports: [CommonModule, FormsModule, InvsitesListViewComponent, InvsitesDetailedViewComponent, UnifiedFilterPanelComponent],
  templateUrl: './invsites.component.html',
  styleUrl: './invsites.component.css'
})
export class InvSitesComponent implements OnInit {
  viewMode: 'list' | 'detailed' = 'list';
  searchText = '';
  selectedSite: string | null = null;
  isMobileSidebarOpen = false;

  sites: SiteItem[] = [];
  normalTableData: SiteInventoryNormalItem[] = [];
  detailedTableData: SiteInventoryDetailedItem[] = [];

  // Filter Props
  showFilterPanel: boolean = false;
  filterFields: FilterField[] = [];
  filterCriteria: any = {
    type: 'All',
    make: 'All',
    model: 'All'
  };

  types: string[] = [];
  makes: string[] = [];
  models: string[] = [];

  constructor(private inventoryService: InventoryService) { }

  ngOnInit() {
    this.loadSitesAndStores();
  }

  loadSitesAndStores() {
    this.inventoryService.getPurchaseSources().subscribe({
      next: (res: any) => {
        if (res?.status === 'Success' && res?.data) {
          const storeSites = res.data.filter((s: any) => s.sourceType === 'Store' || s.sourceType === 'Site');
          this.sites = storeSites.map((s: any) => ({
            id: s.sourceId,
            name: s.sourceName,
            isActive: false
          }));

          if (this.sites.length > 0) {
            this.selectedSite = this.sites[0].name;
            this.sites[0].isActive = true;
            this.loadSiteInventory(this.sites[0].id);
          }
        }
      },
      error: (err: any) => console.error('Failed to load sites and stores', err)
    });
  }

  loadSiteInventory(siteId: number) {
    const viewTypeStr = this.viewMode === 'list' ? 'NORMAL' : 'DETAILED';
    this.inventoryService.getSiteInventory(siteId, viewTypeStr).subscribe({
      next: (res) => {
        if (res?.status === 'Success' && res?.data) {
          if (this.viewMode === 'list') {
            this.normalTableData = res.data as SiteInventoryNormalItem[];
            this.populateFilterOptions();
          } else {
            this.detailedTableData = res.data as SiteInventoryDetailedItem[];
          }
        }
      },
      error: (err) => console.error('Failed to load site inventory', err)
    });
  }

  get filteredNormalData(): SiteInventoryNormalItem[] {
    return this.normalTableData.filter(item => {
      if (this.filterCriteria.type !== 'All' && item.type !== this.filterCriteria.type) return false;
      if (this.filterCriteria.make !== 'All' && item.make !== this.filterCriteria.make) return false;
      if (this.filterCriteria.model !== 'All' && item.model !== this.filterCriteria.model) return false;
      return true;
    });
  }

  populateFilterOptions() {
    const uniqueTypes = new Set<string>();
    const uniqueMakes = new Set<string>();
    const uniqueModels = new Set<string>();

    this.normalTableData.forEach(item => {
      if (item.type) uniqueTypes.add(item.type);
      if (item.make) uniqueMakes.add(item.make);
      if (item.model) uniqueModels.add(item.model);
    });

    this.types = Array.from(uniqueTypes).sort();
    this.makes = Array.from(uniqueMakes).sort();
    this.models = Array.from(uniqueModels).sort();

    this.setupFilterFields();
  }

  setupFilterFields() {
    this.filterFields = [
      {
        key: 'type',
        label: 'Select Type',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.types.map(t => ({ label: t, value: t }))]
      },
      {
        key: 'make',
        label: 'Select Make',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.makes.map(m => ({ label: m, value: m }))]
      },
      {
        key: 'model',
        label: 'Select Model',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.models.map(m => ({ label: m, value: m }))]
      }
    ];
  }

  toggleFilterPanel() {
    this.showFilterPanel = !this.showFilterPanel;
  }

  onFilterClose() {
    this.showFilterPanel = false;
  }

  onFilterReset() {
    this.filterCriteria = {
      type: 'All',
      make: 'All',
      model: 'All'
    };
  }

  onFilterApply(criteria: any) {
    this.filterCriteria = { ...criteria };
    this.showFilterPanel = false;
  }

  onFilterCriteriaChange(criteria: any) {
    this.filterCriteria = { ...criteria };
  }

  get filteredSites(): SiteItem[] {
    if (!this.searchText) return this.sites;
    const lowerCaseSearch = this.searchText.toLowerCase();
    return this.sites.filter(s => s.name.toLowerCase().includes(lowerCaseSearch));
  }

  onSearchChange() {
    // No-op, filtering is handled by the filteredSites getter
  }

  selectSite(siteName: string) {
    this.selectedSite = siteName;
    this.sites.forEach(s => s.isActive = (s.name === siteName));

    const site = this.sites.find(s => s.name === siteName);
    if (site) {
      this.loadSiteInventory(site.id);
    }
    this.closeMobileSidebar();
  }

  switchViewMode(mode: 'list' | 'detailed') {
    this.viewMode = mode;
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'list' ? 'detailed' : 'list';
    const site = this.sites.find(s => s.name === this.selectedSite);
    if (site) {
      this.loadSiteInventory(site.id);
    }
  }

  toggleMobileSidebar() {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen = false;
  }

  handleViewDetails(data: any) {
    console.log("View details for", data);
  }
}
