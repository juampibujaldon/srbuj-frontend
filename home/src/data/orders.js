export const ordersSeed = [
  {
    id: "OC-0001",
    customer: "Juan Pérez",
    items: [{ title: "Mate Hogwarts", qty: 1, price: 8900 }],
    total: 8900,
    status: "pendiente",
    date: "2025-08-10",
  },
  {
    id: "OC-0002",
    customer: "María García",
    items: [
      { title: "Llavero Personalizado", qty: 2, price: 3500 },
      { title: "Organizador Cable", qty: 1, price: 1200 },
    ],
    total: 3500 * 2 + 1200,
    status: "en_proceso",
    date: "2025-08-12",
  },
  {
    id: "OC-0003",
    customer: "Carlos Díaz",
    items: [{ title: "Pin Carpincho", qty: 3, price: 1500 }],
    total: 1500 * 3,
    status: "imprimiendo",
    date: "2025-08-15",
  },
  {
    id: "OC-0004",
    customer: "Lucía Torres",
    items: [{ title: "Soporte Celular", qty: 1, price: 2600 }],
    total: 2600,
    status: "enviado",
    date: "2025-08-18",
  },
];

export const salesByDaySeed = [
  { date: "2025-08-10", amount: 8900 },
  { date: "2025-08-11", amount: 0 },
  { date: "2025-08-12", amount: 8200 },
  { date: "2025-08-13", amount: 0 },
  { date: "2025-08-14", amount: 0 },
  { date: "2025-08-15", amount: 4500 },
  { date: "2025-08-16", amount: 0 },
  { date: "2025-08-17", amount: 0 },
  { date: "2025-08-18", amount: 2600 },
];
