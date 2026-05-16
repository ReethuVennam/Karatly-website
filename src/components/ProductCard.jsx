import { useState } from "react";
import { Coins } from "lucide-react";

const formatPrice = (price) =>
  Number(price || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function ProductCard({ product, onClick, onBuy }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = String(product?.status || "").toLowerCase() === "active";

  const handleOpen = () => {
    onClick(product?.sku);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      }}
      className="overflow-hidden rounded-2xl border border-gray-800 bg-[#111] text-left transition hover:-translate-y-1.5"
    >
      {product?.imageUrl ? (
        <div className="flex h-48 w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_70%)] p-5">
          <img
            src={product.imageUrl}
            alt={product?.name || "Product"}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-gray-800">
          <Coins size={40} />
        </div>
      )}

      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold">
            {product?.name || "Untitled Product"}
          </h3>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isActive
                ? "bg-green-500/20 text-green-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <p className="mb-4 text-xl text-yellow-400">
          Rs. {formatPrice(product?.basePrice)}
        </p>

        {isExpanded && (
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-gray-300">
            <p>Metal: {product?.metalType || "NA"}</p>
            <p>Purity: {product?.purity || "NA"}</p>
            <p>Weight: {product?.productWeight || "NA"}g</p>
            <p>Redeem: {product?.redeemWeight || "NA"}g</p>
          </div>
        )}

        {isExpanded && (
          <>
            {product?.description ? (
              <p className="mb-4 text-sm text-gray-400">
                {product.description}
              </p>
            ) : (
              <p className="mb-4 text-sm text-gray-500">
                Product description is not available.
              </p>
            )}
          </>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy?.(product);
            }}
            className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black transition hover:scale-105"
          >
            Buy Now
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex w-full items-center justify-end gap-3 text-sm text-gray-400 transition hover:text-yellow-400"
          >
            <span>{isExpanded ? "Show Less" : "View Details"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
