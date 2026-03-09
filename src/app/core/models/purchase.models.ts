export interface Product {
    id: number;
    productName: string;
    units: string;
    make: string;
    model: string;
    productCode: string;
    publishedDate: string;
    useFor: string;
}

export interface ProductsResponse {
    status: string;
    statusCode: number;
    message: string;
    data: Product[];
}

export interface PurchaseDetail {
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    purchaseFrom: string;
    deliveredTo: string;
    purchaseType: string;
    totalAmount: number;
    status: string;
    statusColor: string;
}

export interface PurchaseItem {
    itemId: number;
    itemName: string;
    itemCode: string;
    make: string;
    model: string;
    count: number;
    unitPrice: number;
    gstPercent: number;
    totalPricePerUnit: number;
    status: string;
    statusColor: string;
    serialDetails: any[]; // Update to specific interface if serial details format is known
}

export interface PurchaseFile {
    id: number;
    fileType: string;
    filePath: string;
}

export interface PurchaseDetailsData {
    purchase: PurchaseDetail;
    items: PurchaseItem[];
    files: PurchaseFile[];
}

export interface PurchaseDetailsResponse {
    status: string;
    statusCode: number;
    message: string;
    data: PurchaseDetailsData;
}
