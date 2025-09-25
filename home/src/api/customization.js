import { apiJson } from "./client";

export async function quoteStlModel(formData) {
  return apiJson("/api/personalizador/cotizar-stl", {
    method: "POST",
    auth: false,
    body: formData,
  });
}
