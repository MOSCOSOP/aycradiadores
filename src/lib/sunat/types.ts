export type CompanySunatConfig = {
  id: number;
  number: string;
  name: string;
  trade_name: string;
  soap_send_id: string;
  soap_type_id: string;
  soap_username: string;
  soap_password: string;
  soap_url: string | null;
  soap_sunat_username: string;
  soap_sunat_password: string;
  certificate: string | null;
  certificate_pem: string | null;
  certificate_password: string | null;
  api_sunat_id: string;
  api_sunat_secret: string;
  sire_client_id: string | null;
  sire_client_secret: string | null;
  sire_username: string | null;
  sire_password: string | null;
  pse: boolean;
  pse_url: string | null;
  pse_token: string | null;
  client_id_pse: string | null;
  send_document_to_pse: boolean;
  type_send_pse: number;
  is_rus: boolean;
  operation_amazonia: boolean;
  config_system_env: number;
};

export type SunatSendResult = {
  success: boolean;
  message: string;
  code?: string;
  ticket?: string;
  cdr?: string;
  /** XML UBL exacto que se envió a SUNAT (para guardar y permitir su descarga posterior). */
  xml?: string;
  mode: "soap" | "pse" | "simulated";
};

export type SunatTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};
