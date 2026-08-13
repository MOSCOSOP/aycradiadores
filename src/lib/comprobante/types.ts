export type ComprobanteItem = {
  code?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount?: number;
  total: number;
};

export type ComprobanteEmisor = {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  telefono?: string;
  telefono2?: string;
  email?: string;
  logo?: string;
  titulo?: string;
  sello?: string;
  banco?: string;
  moneda?: string;
  cuentaBancaria?: string;
  cci?: string;
  detractionLabel?: string;
  detractionBank?: string;
  footerServiceText?: string;
  brandLogos?: string[];
};

export type ReceiptData = {
  kind: string;
  id?: number;
  number: string;
  document_type_id: string;
  document_type_label: string;
  series_label?: string;
  moneda?: string;

  emisor?: ComprobanteEmisor;

  customer_name: string;
  customer_number: string;
  customer_address?: string;
  customer_province?: string;
  customer_district?: string;
  customer_email?: string;
  customer_phone?: string;

  seller_name?: string;
  items: ComprobanteItem[];

  total: number;
  total_taxed: number;
  total_igv: number;
  total_exonerated?: number;
  total_discount?: number;

  payment_method: string;
  payment_condition: string;
  date_of_issue: string;
  date_of_due?: string;
  plate?: string;
  purchase_order?: string;
  dispatch_number?: string;

  hash?: string;
  qr_payload?: string;
  share_token?: string;
  observations?: string;
};
