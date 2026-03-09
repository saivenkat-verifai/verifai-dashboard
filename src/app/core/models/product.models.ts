export interface Pagination {
  pageNo: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  status: string;
  statusCode: number;
  message: string;
  data: T;
  pagination?: Pagination;
}

export interface ProductListItem {
  id: number;
  productName: string;
  make: string;
  model: string;
  serialNumber: string;
  barCode: string;
  quantity: number;
  publishedDate: string;
  currentLocation: string;
  status: string;
}

export interface MasterProduct {
  productId: number;
  id?: number;
  productName: string;
  units: string | null;
  make: string;
  model: string;
  productCode: string;
  publishedDate: string;
  useFor: string;
}

export interface ProductItem {
  itemId: number;
  itemName: string;
  make: string;
  model: string;
  quantity: number;
  units: string | null;
}

export interface ProductDetails {
  id: number;
  productName: string;
  productCode: string;
  units: string | null;
  make: string;
  model: string;
  publishedDate: string;
  useFor: string;
  itemsList: ProductItem[];
}

export interface ProductAllDetailsHeader {
  title: string;
  subtitle: string;
}

export interface ProductAllDetailsInfo {
  serialNumber: string;
  barcode: string;
  unit: string;
  status: string;
  location: string;
  publishedDate: string;
}

export interface ProductAllDetailsHardware {
  itemName: string;
  make: string;
  model: string;
  units?: string;
  qty?: number;
  cost: number;
  itemImage: string | null;
  purchaseLink?: string | null;
}

export interface ProductAllDetailsProgress {
  date: string;
  from: string | null;
  to: string | null;
  action: string;
}

export interface ProductAllDetails {
  header: ProductAllDetailsHeader;
  productDetails: ProductAllDetailsInfo;
  hardware: ProductAllDetailsHardware[];
  manufacturingCost: number;
  progress: ProductAllDetailsProgress[];
}
