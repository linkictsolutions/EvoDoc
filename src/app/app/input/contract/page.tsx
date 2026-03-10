import { redirect } from "next/navigation";

export default function LegacyContractInputPage() {
  redirect("/app/contracts/new");
}
