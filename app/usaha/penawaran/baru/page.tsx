import { Navbar } from "@/components/navbar";
import { FormWizard } from "@/components/forms/form-wizard";
import { getCurrentUserProfile } from "@/lib/supabase/server";

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
        kind="offer"
        initialRequestId={params.requestId || null}
        initialEntryId={params.entryId || null}
      />
    </>
  );
}
