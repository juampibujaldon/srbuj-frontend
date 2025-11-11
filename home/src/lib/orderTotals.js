const toNumber = (value, { round = true } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return round ? Math.round(numeric) : numeric;
};

const getLineQuantity = (item) => {
  const qty = Number(item?.quantity ?? item?.qty ?? 1);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
};

const getLinePrice = (item) => {
  const price = Number(item?.unit_price ?? item?.price ?? 0);
  return Number.isFinite(price) ? price : 0;
};

export function calculateOrderTotals(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemsTotal = items.reduce(
    (acc, item) => acc + getLinePrice(item) * getLineQuantity(item),
    0,
  );
  const shippingQuote = order?.shipping_quote || order?.shippingQuote || {};
  const shippingCost = toNumber(
    order?.shipping_cost ?? shippingQuote?.precio ?? shippingQuote?.price ?? 0,
  );
  const fallbackTotal = toNumber(order?.total ?? order?.total_amount ?? 0);
  const calculatedTotal = itemsTotal + shippingCost;
  const total =
    calculatedTotal > 0
      ? calculatedTotal
      : fallbackTotal > 0
        ? fallbackTotal
        : 0;

  return {
    itemsTotal,
    shippingCost,
    calculatedTotal,
    fallbackTotal,
    total,
  };
}

export function getDisplayTotal(order) {
  return calculateOrderTotals(order).total;
}

export default calculateOrderTotals;
