const plainFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: false,
});

const groupedFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: true,
});

const normalizeAmount = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.round(numeric);
  }
  return 0;
};

export function formatPrice(value, { withSymbol = true, grouped = false } = {}) {
  const amount = normalizeAmount(value);
  const formatter = grouped ? groupedFormatter : plainFormatter;
  const formatted = formatter.format(amount);
  return withSymbol ? `AR$ ${formatted}` : formatted;
}

export function formatCompactPrice(value) {
  const amount = normalizeAmount(value);
  if (Math.abs(amount) >= 1000) {
    return `AR$ ${(amount / 1000).toFixed(1)}k`;
  }
  return `AR$ ${plainFormatter.format(amount)}`;
}

export default formatPrice;
