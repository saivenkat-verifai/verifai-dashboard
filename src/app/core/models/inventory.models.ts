export interface MetadataItem {
  id: number;
  keyId: number;
  code: string;
  value: string;
  active: string;
  remarks: string | null;
}

export interface MetadataResponse {
  type: number;
  typeName: string;
  metadata: MetadataItem[];
}

export interface StockItem {
  itemId: number;
  itemName: string;
  itemCode: string;
  make: string;
  model: string;
  unitsName: string;
  usedFor: string;
  opening: number;
  purchase: number;
  issued: number;
  returned: number;
  closing: number;
  preorder: number;
}

export interface StockSummaryResponse {
  status: string;
  statusCode: number;
  message: string;
  data: StockItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface PurchaseItem {
  id: string;
  date: string;
  invoiceNo: string;
  purchaseFrom: string;
  deliveredTo: string;
  deliveredToName?: string;
  type: string;
  purchaseType?: string;
  items: number;
  status: string;
  itemsDetails?: any[];
}

export interface IssuedItem {
  id: number;
  issueDate: string;
  issuedFrom: string;
  issuedFromId: number;
  issuedTo: string;
  issuedToId: number;
  category: string;
  transportation: string;
  billing: string;
  status: string;
}

export interface IssuedListParams {
  pageNo: number;
  pageSize: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  storeId?: number;
}

export interface IssuedListResponse {
  status: string;
  statusCode: number;
  data: IssuedItem[];
  pagination: {
    pageNo: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface ReturnItem {
  id: string;
  date: string;
  site: string;
  returnTo: string;
  itemsProducts: string;
  status: string;
}

export interface IssuedDetailHeader {
  id: number;
  issueDate: string;
  issuedFrom: string;
  issuedTo: string;
  category: string;
  transportation: string;
  billing: string;
  trackingId: string;
  shipmentDate: string;
  deliveredDate: string;
  status: string;
}

export interface IssuedDetailItem {
  id: number;
  itemName: string;
  quantity: number;
  units: string;
  billingStatus: string;
  serialNumber: string;
  barcode: string;
  assignSite: string | null;
}

export interface IssuedHardware {
  itemName: string;
  itemsQuantity: number;
  units: string;
}

export interface IssuedDetailProduct {
  id: number;
  productDetailsId: number;
  productName: string;
  quantity: number;
  units: string;
  billingStatus: string;
  hardware: IssuedHardware[];
  expanded?: boolean;
}

export interface IssuedDetailResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    header: IssuedDetailHeader;
    items: IssuedDetailItem[];
    products: IssuedDetailProduct[];
  };
}

export interface CreateIssueItemPayload {
  itemId: number;
  quantity: number;
  serialNumber: string;
  barcode: string;
  billingTypeId: number;
}

export interface CreateIssueProductPayload {
  productDetailsId: number;
  quantity: number;
  billingTypeId: number;
}

export interface CreateIssuePayload {
  issueDate: string;
  issuedFromId: number;
  issuedToId: number;
  categoryId: number;
  billingTypeId: number;
  transportationId: number;
  trackingId: string;
  shipmentDate: string;
  deliveredDate: string;
  remarks: string;
  items: CreateIssueItemPayload[];
  products: CreateIssueProductPayload[];
  createdBy: number;
  createdTime: string;
}

export interface ItemForIssue {
  id: number;
  itemName: string;
  make: string;
  model: string;
  itemCode: string;
  serialNumber: string;
  barcode: string;
  units: string;
}

export interface ItemsForIssueResponse {
  status: string;
  statusCode: number;
  message: string;
  data: ItemForIssue[];
}

export interface ProductForIssue {
  productId: number;
  productName: string;
  productDetailsId: number;
  serialNumber: string;
  barCode: string;
  quantity: number;
  productStatus: string;
  make: string;
  model: string;
  units: string;
}

export interface ProductsForIssueResponse {
  status: string;
  statusCode: number;
  message: string;
  data: ProductForIssue[];
}

export interface ReturnableStockItem {
  issueItemId: number;
  itemId: number;
  itemName: string;
  make: string;
  model: string;
  serialNumber: string;
  barcode: string;
  quantity: number;
  issueId: number;
}

export interface ReturnableStockProduct {
  issueProductId: number;
  productDetailsId: number;
  productName: string;
  make: string;
  model: string;
  serialNumber: string;
  barCode: string; // From JSON: barCode (capital C)
  quantity: number;
  issueId: number;
}

export interface ReturnableStockResponse {
  status: string;
  statusCode: number;
  data: {
    items: ReturnableStockItem[];
    products: ReturnableStockProduct[];
  };
}

export interface AddReturnItemPayload {
  issueItemId: number;
  itemId: number;
  conditionType: string;
}

export interface AddReturnProductPayload {
  issueProductId: number;
  productDetailsId: number;
  conditionType: string;
}

export interface AddReturnPayload {
  returnDate: string;
  returnFromId: number;
  returnToId: number;
  remarks: string;
  items: AddReturnItemPayload[];
  products: AddReturnProductPayload[];
  createdBy: number;
}

export interface ReturnListItem {
  id: number;
  returnDate: string;
  returnFrom: string;
  returnTo: string;
  status: string;
  totalEntries: number;
}

export interface ReturnListParams {
  pageNo: number;
  pageSize: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  storeId?: number;
}

export interface ReturnListResponse {
  status: string;
  statusCode: number;
  data: ReturnListItem[];
  pagination?: {
    pageNo: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface ReturnDetailsHeader {
  id: number;
  returnDate: string;
  returnFrom: string;
  returnTo: string;
  status: string;
  remarks: string;
}

export interface ReturnDetailsItem {
  id: number;
  itemName: string;
  serialNumber: string;
  barcode: string;
  quantity: number;
  conditionType: string;
  billingType: string;
}

export interface ReturnDetailsProduct {
  id: number;
  productName: string;
  serialNumber: string;
  barCode: string;
  make: string;
  model: string;
  quantity: number;
  conditionType: string;
}

export interface ReturnDetailsData {
  header: ReturnDetailsHeader;
  items: ReturnDetailsItem[];
  products: ReturnDetailsProduct[];
}

export interface ReturnDetailsResponse {
  status: string;
  statusCode: number;
  data: ReturnDetailsData;
}

export interface UpdateReturnItem {
  returnItemId: number;
  conditionType: string;
}

export interface UpdateReturnProduct {
  returnProductId: number;
  conditionType: string;
}

export interface UpdateReturnPayload {
  status: string;
  remarks: string;
  modifiedBy: number;
  items: UpdateReturnItem[];
  products: UpdateReturnProduct[];
}

export interface SiteInventoryNormalItem {
  id: number;
  name: string;
  type: string;
  make: string;
  model: string;
  delivered: number;
  returned: number;
}

export interface SiteInventoryDetailedItem {
  activityDate: string;
  name: string;
  action: string;
  quantity: number;
}

export interface SiteInventoryResponse {
  status: string;
  statusCode: number;
  viewType: 'NORMAL' | 'DETAILED';
  data: SiteInventoryNormalItem[] | SiteInventoryDetailedItem[];
}
