import { redirect } from "next/navigation";

export default function IndexPage() {
  redirect("/customer/orders");
}
