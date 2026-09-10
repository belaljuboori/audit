import { getCurrentUser } from "@/lib/auth";
import { SiteHeaderClient } from "@/components/layout/site-header-client";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return <SiteHeaderClient user={user} />;
}
