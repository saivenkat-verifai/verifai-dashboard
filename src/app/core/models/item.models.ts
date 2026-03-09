export interface Item {
  id: number;
  itemName: string;
  itemCode: string;
  units: string;
  make: string;
  model: string;
  usedFor: string;
  remarks?: string;
  itemImage?: string;
  inv_nature?: string;
  inv_domain?: string;
  inv_partcode?: string;
  inv_made?: string;
  sequence_number?: string;
}

/**
 * Full item detail from /getItemDetails_1_0/{itemId}
 */
export interface ItemDetail {
  id: number;
  itemName: string;
  itemCode: string;
  make: string;
  model: string;
  units: string;
  nature: string;
  domain: string;
  partCode: string;
  made: string;
  usedFor: string;
  purchaseLinks: string[] | null;
  itemImage: string | null;
  remarks: string | null;
}

export interface AllItem {
  itemName: string;
  itemCode: string;
  unit: string;
  make: string;
  model: string;
  usedFor: string;
  serialNumber: string;
  barcodeNo: string;
  qty: number;
  purchaseDate: string;
  nowAt: string;
  status: string;
}

export interface PurchaseLink {
  purchaseLinkId: number;
  purchaseLink: string;
}

export interface InventoryItem {
  purchaseItemId: number;
  itemId: number;
  itemName: string;
  make: string;
  model: string;
  itemImage: string | null;
  serialNumber: string | null;
  barcode: string | null;
  qty: number;
  purchaseDate: string;
  invoiceNumber: string;
  locationId: number;
  locationName: string;
  entityType: string;
  country: string;
  status: string;
  statusColor: string;
  purchaseLinks: PurchaseLink[];
}

export interface InventoryItemsResponse {
  status: string;
  statusCode: number;
  data: InventoryItem[];
  pagination: {
    pageNo: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface InventoryItemHeader {
  title: string | null;
  subtitle: string | null;
}

export interface InventoryItemDetails {
  purchaseItemId: number;
  itemId: number;
  itemCode: string | null;
  unit: string | null;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  barcode: string | null;
  usedFor: string | null;
  status: string | null;
  statusColor: string | null;
  invoiceNumber: string | null;
  purchaseDate: string | null;
  itemCostWithGST: number | null;
}

export interface InventoryItemLocation {
  locationId: number | null;
  locationName: string | null;
  entityType: string | null;
}

export interface InventoryItemTimeline {
  date: string | null;
  from: InventoryItemLocation | null;
  to: InventoryItemLocation | null;
  condition: string | null;
  action: string | null;
}

export interface InventoryItemData {
  header: InventoryItemHeader;
  itemDetails: InventoryItemDetails;
  timeline: InventoryItemTimeline[];
}

export interface InventoryItemDetailsResponse {
  status: string;
  statusCode: number;
  data: InventoryItemData;
}
