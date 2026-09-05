// Catálogo SUNAT 05 (código de tributo) por afectación (catálogo 07) — cada tipo de afectación
// va con su PROPIO cac:TaxScheme, no todos "1000/IGV/VAT". Usar siempre el esquema IGV con monto
// 0.00 para líneas exoneradas/inafectas es lo que causaba el rechazo real de SUNAT "el monto de
// afectación de IGV por línea debe ser diferente a 0.00" (código 3111) — confirmado con un envío
// real rechazado en Producción antes de este fix. Tabla verificada contra una librería de
// facturación electrónica peruana real y ampliamente usada en producción (greenter).
//
// Módulo separado (sin depender de soap.ts) para que builders de otros documentos (Comunicación
// de Baja, Resumen, etc.) puedan reusarla sin crear un import circular.
export const TRIBUTO_BY_AFECTACION: Record<string, { id: string; name: string; typeCode: string }> = {
  "10": { id: "1000", name: "IGV", typeCode: "VAT" }, // Gravado
  "20": { id: "9997", name: "EXO", typeCode: "VAT" }, // Exonerado
  "30": { id: "9998", name: "INA", typeCode: "FRE" }, // Inafecto
  "40": { id: "9995", name: "EXP", typeCode: "FRE" }, // Exportación
};
