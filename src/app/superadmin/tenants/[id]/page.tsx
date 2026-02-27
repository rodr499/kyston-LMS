import { db } from "@/lib/db";
import { churches, users, programs, courses, classes as classesTable } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, Users, CreditCard, ExternalLink } from "lucide-react";
import TenantPlanSection from "./TenantPlanSection";
import TenantActions from "./TenantActions";
import CustomDomainForm from "./CustomDomainForm";
import { PromoteToSuperAdminButton } from "../../users/PromoteToSuperAdminButton";

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subdomainWarning?: string }>;
}) {
  const { id } = await params;
  const { subdomainWarning } = await searchParams;
  const church = await db.query.churches.findFirst({
    where: eq(churches.id, id),
  });
  if (!church) notFound();

  const churchUsers = await db.query.users.findMany({
    where: eq(users.churchId, id),
    columns: { id: true, email: true, fullName: true, role: true, isActive: true },
  });
  const [programListBase, coursesList, classesList] = await Promise.all([
    db.query.programs.findMany({ where: eq(programs.churchId, id) }),
    db.query.courses.findMany({ where: eq(courses.churchId, id) }),
    db.query.classes.findMany({ where: eq(classesTable.churchId, id) }),
  ]);
  const coursesWithClasses = coursesList.map((c) => ({
    ...c,
    classes: classesList.filter((cls) => cls.courseId === c.id),
  }));
  const programList = programListBase.map((p) => ({
    ...p,
    courses: coursesWithClasses.filter((c) => c.programId === p.id),
  }));
  const [studentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.churchId, id), eq(users.role, "student")));
  const [facCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.churchId, id), eq(users.role, "facilitator")));

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org";
  const tenantOrigin = `https://${church.subdomain}.${appDomain}`;

  const roleBadge = (role: string) => {
    if (role === "super_admin") return <span className="badge badge-accent badge-sm font-body whitespace-nowrap">Super Admin</span>;
    if (role === "church_admin") return <span className="badge badge-primary badge-sm font-body">Admin</span>;
    if (role === "facilitator") return <span className="badge badge-secondary badge-sm font-body">Facilitator</span>;
    return <span className="badge badge-ghost badge-sm font-body">Student</span>;
  };

  return (
    <div className="space-y-8">
      {subdomainWarning && (
        <div className="alert alert-warning rounded-xl gap-2">
          <span className="font-body">
            Subdomain setup failed. Add <strong>{church.subdomain}.{appDomain}</strong> manually in Vercel → Project → Settings → Domains. See docs/SUBDOMAINS.md.
          </span>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">{church.name}</h1>
          <p className="font-body text-base-content/60 mt-1">{church.subdomain}.{appDomain}</p>
        </div>
        <a
          href={tenantOrigin}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 font-body"
        >
          <ExternalLink className="w-4 h-4" /> Open site
        </a>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Plan</div>
          <div className="stat-value font-heading text-2xl">
            <span className="badge badge-primary badge-outline font-body capitalize">{church.plan}</span>
          </div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-primary"><Users className="w-6 h-6" /></div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Students</div>
          <div className="stat-value text-primary font-heading text-2xl">{studentCount?.count ?? 0}</div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-secondary"><Building2 className="w-6 h-6" /></div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Facilitators</div>
          <div className="stat-value text-secondary font-heading text-2xl">{facCount?.count ?? 0}</div>
        </div>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
        <div className="card-body">
          <h2 className="font-heading text-lg font-semibold">Branding</h2>
          <p className="font-body text-sm">Subdomain: {church.subdomain}</p>
          <p className="font-body text-sm">Primary color: {church.primaryColor}</p>
          {church.logoUrl && (
            <img src={church.logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-xl" />
          )}
        </div>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
        <div className="card-body">
          <h2 className="font-heading text-lg font-semibold">Custom domain</h2>
          <p className="font-body text-sm text-base-content/70 mb-4">
            Allow this tenant to use their own domain (e.g. ruta.acmk.us). Set the domain and record type; the tenant adds the DNS record at their registrar.
          </p>
          <CustomDomainForm
            churchId={id}
            initialDomain={church.customDomain}
            initialRecordType={church.customDomainRecordType as "CNAME" | "A" | null}
            cnameValue={process.env.VERCEL_CNAME ?? "cname.vercel-dns.com"}
            aValue={process.env.VERCEL_IP ?? "216.198.79.1"}
          />
        </div>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="p-6 border-b border-base-300">
            <h2 className="font-heading text-lg font-semibold">Users</h2>
          </div>
          <div className="table-responsive-card overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {churchUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-base-200 transition-colors">
                    <td data-label="Name" className="font-body font-medium">{u.fullName}</td>
                    <td data-label="Email" className="font-body text-base-content/70">{u.email}</td>
                    <td data-label="Role">{roleBadge(u.role)}</td>
                    <td data-label="Status">
                      {u.isActive ? (
                        <span className="badge badge-success gap-1 font-body text-xs">Active</span>
                      ) : (
                        <span className="badge badge-ghost font-body text-xs">Inactive</span>
                      )}
                    </td>
                    <td data-label="Actions">
                      {u.role !== "super_admin" ? (
                        <PromoteToSuperAdminButton userId={u.id} tenantId={id} />
                      ) : (
                        <span className="text-base-content/40 font-body text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
        <div className="card-body">
          <h2 className="font-heading text-lg font-semibold">Programs & classes</h2>
          <ul className="font-body space-y-2">
            {programList.map((p) => (
              <li key={p.id}>
                <strong className="font-heading">{p.name}</strong>
                <ul className="list-disc list-inside ml-4 mt-1 text-sm text-base-content/70">
                  {(p.courses ?? []).map((c) => (
                    <li key={c.id}>
                      {c.name} — {(c.classes ?? []).length} class(es)
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <TenantPlanSection churchId={id} />
      <TenantActions churchId={id} churchName={church.name} isActive={church.isActive} />
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
        <div className="card-body gap-2">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Billing
          </h2>
          <p className="font-body text-sm">Stripe customer: {church.stripeCustomerId ?? "—"}</p>
          <p className="font-body text-sm">Subscription: {church.stripeSubscriptionId ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
