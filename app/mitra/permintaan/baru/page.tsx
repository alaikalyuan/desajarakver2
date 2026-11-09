import { Navbar } from "@/components/navbar";
import { FormWizard } from "@/components/forms/form-wizard";
import { getCurrentUserProfile } from "@/lib/supabase/server";

export default async function PermintaanBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ entryId?: string }>;
}) {
  const [user, params] = await Promise.all([
    getCurrentUserProfile(),
    searchParams,
  ]);

  return (
    <>
      <Navbar initialUser={user} />
      <FormWizard
        kind="request"
        initialEntryId={params.entryId || null}
      />
    </>
  );
}
