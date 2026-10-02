import { KeyRound, ShieldCheck, UserPlus, Users } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inviteAppUser,
  replaceAppUserPermissions,
  revokeAppInvitation,
  setAppUserActive,
} from "@/lib/actions/access";
import { PermissionChecklist } from "@/components/permission-checklist";
import { ActionForm } from "@/components/action-form";
import { FormDisclosure } from "@/components/form-disclosure";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

function fmt(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function UsersAccessPage() {
  const access = await requirePermission("admin.permissions");
  const admin = createAdminClient();

  const [
    { data: profiles },
    { data: permissionRows },
    { data: invitations },
  ] = await Promise.all([
    admin.from("profiles").select("id,email,full_name,is_active,onboarding_completed_at,preferred_workspace,created_at").order("created_at"),
    admin.from("user_permissions").select("user_id,permission_key,created_at").order("permission_key"),
    admin.from("access_invitations").select("id,email,permission_keys,used_at,used_by,revoked_at,created_at").is("revoked_at", null).order("created_at", { ascending: false }),
  ]);

  const byUser = new Map<string,string[]>();
  for (const row of permissionRows || []) {
    const list = byUser.get(String(row.user_id)) || [];
    list.push(String(row.permission_key));
    byUser.set(String(row.user_id), list);
  }

  const inviteForm = <ActionForm
    action={inviteAppUser}
    successMessage="Dostęp przygotowany"
    resetOnSuccess
    className="space-y-5"
  >
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Adres Google / e-mail</label>
      <Input name="email" type="email" required placeholder="tester@firma.pl"/>
      <div className="mt-1 text-[11px] leading-5 text-[#8a98a3]">Po zapisaniu użytkownik może zalogować się przez Google. Nie trzeba dodawać go ręcznie do ALLOWED_EMAILS.</div>
    </div>
    <PermissionChecklist includeAdmin={false}/>
    <div className="flex justify-end"><Button type="submit"><UserPlus size={15}/> Przygotuj dostęp</Button></div>
  </ActionForm>;

  return <div className="space-y-6">
    <SectionHeader
      title="Użytkownicy i dostęp"
      action={<FormDisclosure label="Dodaj użytkownika" align="right">{inviteForm}</FormDisclosure>}
    />

    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardContent className="p-5"><div className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a98a3]">Konta</div><div className="mt-2 text-3xl font-black text-[#283943]">{profiles?.length || 0}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a98a3]">Aktywne</div><div className="mt-2 text-3xl font-black text-emerald-600">{(profiles || []).filter((item:any) => item.is_active).length}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a98a3]">Oczekujące dostępy</div><div className="mt-2 text-3xl font-black text-[#568deb]">{(invitations || []).filter((item:any) => !item.used_at).length}</div></CardContent></Card>
    </div>

    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><Users size={18}/></div>
          <div><h2 className="font-bold text-[#2a3944]">Użytkownicy</h2><div className="text-xs text-[#83909b]">aktywacja kont i zakres modułów</div></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(profiles || []).map((profile:any) => {
          const permissions = byUser.get(String(profile.id)) || [];
          const isSelf = profile.id === access.user.id;
          const permissionForm = <ActionForm
            action={replaceAppUserPermissions.bind(null, profile.id)}
            successMessage="Uprawnienia zapisane"
            className="space-y-5"
          >
            <div className="rounded-xl bg-[#f7f9fc] px-3 py-2 text-xs text-[#71808b]">
              Zapis zastępuje cały zestaw uprawnień użytkownika. Administrator ma dostęp do wszystkich modułów niezależnie od pozostałych checkboxów.
            </div>
            <PermissionChecklist selected={permissions}/>
            <div className="flex justify-end"><Button type="submit"><KeyRound size={15}/> Zapisz uprawnienia</Button></div>
          </ActionForm>;

          return <div key={profile.id} className="rounded-2xl border border-[#e5eaf0] bg-[#fbfcfe] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-sm font-bold text-[#34444f]">{profile.full_name || profile.email}</div>
                  {isSelf && <Badge variant="blue">To Ty</Badge>}
                  <Badge variant={profile.is_active ? "green" : "red"}>{profile.is_active ? "Aktywny" : "Wyłączony"}</Badge>
                  {permissions.includes("admin.permissions") && <Badge variant="amber">Administrator</Badge>}
                  <Badge variant={profile.onboarding_completed_at ? "neutral" : "amber"}>{profile.onboarding_completed_at ? "Onboarding OK" : "Onboarding"}</Badge>
                </div>
                <div className="mt-1 text-xs text-[#83909b]">{profile.email} · {permissions.length} uprawnień · konto od {fmt(profile.created_at)}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <FormDisclosure label="Uprawnienia" compact variant="secondary" align="right">{permissionForm}</FormDisclosure>
                {!isSelf && <ActionForm
                  action={setAppUserActive.bind(null, profile.id, !profile.is_active)}
                  successMessage={profile.is_active ? "Użytkownik wyłączony" : "Użytkownik aktywowany"}
                >
                  <Button type="submit" size="sm" variant={profile.is_active ? "ghost" : "soft"} className={profile.is_active ? "text-red-600 hover:bg-red-50" : ""}>
                    {profile.is_active ? "Wyłącz konto" : "Aktywuj konto"}
                  </Button>
                </ActionForm>}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {permissions.slice(0,12).map(permission => <span key={permission} className="rounded-lg bg-white px-2 py-1 font-mono text-[10px] text-[#71808b] ring-1 ring-[#e4eaf0]">{permission}</span>)}
              {permissions.length > 12 && <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-[#84929d] ring-1 ring-[#e4eaf0]">+{permissions.length - 12}</span>}
            </div>
          </div>;
        })}
        {!(profiles || []).length && <EmptyState title="Brak użytkowników" description="Pierwsze konto pojawi się po logowaniu Google."/>}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><ShieldCheck size={18}/></div>
          <div><h2 className="font-bold text-[#2a3944]">Przygotowane dostępy</h2><div className="text-xs text-[#83909b]">adresy dopuszczone do pierwszego logowania</div></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {(invitations || []).map((invite:any) => <div key={invite.id} className="flex flex-col gap-3 rounded-xl border border-[#edf1f5] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><div className="truncate text-sm font-semibold text-[#40515d]">{invite.email}</div><Badge variant={invite.used_at ? "green" : "blue"}>{invite.used_at ? "Użyty" : "Oczekuje"}</Badge></div>
            <div className="mt-1 text-xs text-[#8996a0]">{invite.permission_keys?.length || 0} uprawnień · utworzono {fmt(invite.created_at)}{invite.used_at ? ` · użyto ${fmt(invite.used_at)}` : ""}</div>
          </div>
          {!invite.used_at && <ActionForm action={revokeAppInvitation.bind(null, invite.id)} successMessage="Zaproszenie wycofane"><Button type="submit" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">Wycofaj</Button></ActionForm>}
        </div>)}
        {!(invitations || []).length && <EmptyState title="Brak oczekujących dostępów" description="Nowy dostęp możesz przygotować przyciskiem u góry."/>}
      </CardContent>
    </Card>
  </div>;
}
