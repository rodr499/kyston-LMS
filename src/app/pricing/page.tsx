import Link from "next/link";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatLimit(val: number, unit: string): string {
  return val === -1 ? `Unlimited ${unit}` : `${val} ${unit}`;
}

function formatStorageMb(mb: number): string {
  if (mb === -1) return "Unlimited storage";
  if (mb >= 1024) return `${Math.round(mb / 1024)}GB storage`;
  return `${mb}MB storage`;
}

function planToFeatures(p: {
  maxFacilitators: number;
  maxStudents: number;
  maxPrograms: number;
  maxCourses: number;
  maxStorageMb: number;
  integrationsMode: string;
  allowedIntegrations: string[] | null;
  customBranding: boolean;
  certificates: boolean;
  smsNotifications: boolean;
  analytics: boolean;
  prioritySupport: boolean;
}): string[] {
  const features: string[] = [
    formatLimit(p.maxFacilitators, "facilitators"),
    formatLimit(p.maxStudents, "students"),
    formatLimit(p.maxPrograms, "programs"),
    formatLimit(p.maxCourses, "courses"),
    formatStorageMb(p.maxStorageMb),
  ];
  if (p.integrationsMode !== "none" && p.allowedIntegrations && p.allowedIntegrations.length > 0) {
    features.push(p.allowedIntegrations.length >= 3 ? "All meeting integrations" : `${p.allowedIntegrations.length} meeting integration(s)`);
  }
  if (p.customBranding) features.push("Custom branding");
  if (p.certificates) features.push("Certificates");
  if (p.smsNotifications) features.push("SMS notifications");
  if (p.analytics) features.push("Analytics dashboard");
  if (p.prioritySupport) features.push("Priority support");
  return features;
}

export default async function PricingPage() {
  const planList = await db.query.plans.findMany({
    where: and(eq(plans.isPublic, true), eq(plans.isActive, true)),
    orderBy: [asc(plans.sortOrder), asc(plans.name)],
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <nav className="navbar bg-[#fafafa]/95 backdrop-blur-sm border-b border-[#e5e7eb] sticky top-0 z-30">
        <div className="container mx-auto flex w-full items-center justify-between">
          <div>
            <Link href="/" className="btn btn-ghost text-xl font-heading font-bold gap-2">
              <span className="text-primary">Kyston</span>
              <span className="text-secondary font-bold"> LMS</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/register" className="btn btn-primary rounded-xl font-body">Get started</Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl font-bold text-base-content mb-4">Simple, transparent pricing</h1>
          <p className="font-body text-lg text-base-content/70">
            Start free. Upgrade when your church grows. No hidden fees.
          </p>
        </div>

        <div className={`grid gap-6 sm:gap-8 max-w-6xl mx-auto items-stretch ${planList.length === 1 ? "lg:grid-cols-1 max-w-md" : planList.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
          {planList.map((plan, i) => {
            const priceMonthly = plan.priceMonthly ? parseFloat(String(plan.priceMonthly)) : 0;
            const isFree = priceMonthly === 0;
            const isFeatured = plan.slug === "pro" || (planList.length >= 2 && i === 1);
            const features = planToFeatures(plan);

            return (
              <div
                key={plan.id}
                className={`card flex flex-col transition-all duration-200 ${
                  isFeatured
                    ? "bg-white shadow-lg rounded-2xl border-2 border-primary relative ring-2 ring-primary"
                    : "bg-white shadow-sm rounded-2xl border border-[#e5e7eb] hover:shadow-lg"
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="badge badge-primary badge-lg font-body">Most Popular</span>
                  </div>
                )}
                <div className={`card-body flex-1 gap-4 ${isFeatured ? "pt-8" : ""}`}>
                  <h2 className={`font-heading text-xl font-semibold ${isFeatured ? "text-primary" : ""}`}>{plan.name}</h2>
                  <p className="font-heading text-3xl font-bold">
                    {isFree ? "Free" : `$${priceMonthly}`}
                    <span className="text-base font-normal text-base-content/60 font-body">/mo</span>
                  </p>
                  <p className="font-body text-sm text-base-content/60">{plan.description ?? ""}</p>
                  <ul className="space-y-3 mt-4 flex-1 font-body text-sm">
                    {features.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className={isFeatured ? "text-secondary" : "text-success"}>✓</span> {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`btn rounded-xl font-body mt-6 w-full ${isFeatured ? "btn-primary" : "btn-outline btn-primary"}`}
                  >
                    Get started
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {planList.length === 0 && (
          <div className="text-center py-16">
            <p className="font-body text-base-content/60">No plans available at the moment. Check back soon!</p>
            <Link href="/register" className="btn btn-primary rounded-xl font-body mt-4">Get started</Link>
          </div>
        )}

        <p className="text-center font-body text-sm text-base-content/60 mt-12">
          All plans include your own subdomain (e.g. yourchurch.kyston.org) and core LMS features.
        </p>
      </main>

      <footer className="bg-[#1a1a2e] text-[#e2e8f0] py-12 mt-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-center">
            <Link href="/" className="font-heading text-2xl font-bold">
              <span className="text-white">Kyston</span>
              <span className="text-secondary"> LMS</span>
            </Link>
            <div className="flex gap-6 font-body text-sm">
              <Link href="/" className="link link-hover text-neutral-content/80">Home</Link>
              <Link href="/register" className="link link-hover text-neutral-content/80">Get started</Link>
            </div>
            <p className="font-body text-sm text-neutral-content/50">Kyston LMS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
