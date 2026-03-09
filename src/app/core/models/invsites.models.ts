export interface SiteItem {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface DetailedItem {
  id: string;
  productItem: string;
  type: string;
  make: string;
  model: string;
  delivered: number;
  returned: number;
}

export interface DetailedViewItem {
  date: string;
  status: 'Issued' | 'Returned';
  items: Array<{
    sNo: number;
    itemProductName: string;
    itemProductDesc?: string;
    store: number;
    online: number;
    totalQty: number;
    units: string;
  }>;
}
