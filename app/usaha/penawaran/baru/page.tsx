import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { FormWizard } from "@/components/forms/form-wizard";
import { getCurrentUserProfile } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Buat Penawaran",
};

export default async function PenawaranBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string; entryId?: string }>;
}) {
  const [user, params] = await Promise.all([
    getCurrentUserProfile(),
    searchParams,
  ]);

  return (
    <>
      <Navbar initialUser={user} />
      <FormWizard
        profile={
          user
            ? { fullName: user.fullName, businessName: user.businessName, phone: user.phone }
            : null
        }
        kind="offer"
        initialRequestId={params.requestId || null}
        initialEntryId={params.entryId || null}
      />
    </>
  );
}
