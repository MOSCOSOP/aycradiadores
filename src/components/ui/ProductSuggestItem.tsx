"use client";

import Image from "next/image";

function productImage(url: string) {
  if (!url || url === "null" || url === "undefined") return "/images/logo-client.png";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return url;
}

export function ProductSuggestItem({
  product,
  currency = "S/",
}: {
  product: Record<string, unknown>;
  currency?: string;
}) {
  const img = productImage(String(product.image_url_small || product.image_url || ""));
  const price = Number(product.sale_unit_price ?? 0);

  return (
    <div className="ify-product-suggest">
      <div className="ify-product-suggest-img">
        <Image src={img} alt="" width={48} height={48} className="h-full w-full object-contain" unoptimized />
      </div>
      <div className="ify-product-suggest-body">
        <div className="ify-product-suggest-name">{String(product.description ?? product.name ?? "")}</div>
        <div className="ify-product-suggest-price">
          {currency} {price.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
