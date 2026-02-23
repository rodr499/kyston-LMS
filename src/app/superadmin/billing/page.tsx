import { db } from "@/lib/db";
import { churches } from "@/lib/db/schema";
import { isNotNull } from "drizzle-orm";
import { CreditCard } from "lucide-react";

export default async function SuperAdminBillingPage() {
  const withSub = await db.query.churches.findMany({
    where: isNotNull(churches.stripeSubscriptionId),
    columns: {
      id: true,
      name: true,
      subdomain: true,
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Billing</h1>
        <p className="text-base-content/60 font-body mt-1">
          Stripe integration: connect webhooks and use Stripe Dashboard for MRR and subscription list.
        </p>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="flex items-center gap-3 p-6 border-b border-base-300">
            <CreditCard className="w-6 h-6 text-primary" />
            <h3 className="font-heading text-lg font-semibold">Subscriptions</h3>
          </div>
          {withSub.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-body text-base-content/50">No subscriptions yet.</p>
            </div>
          ) : (
            <div className="table-responsive-card overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                    <th>Church</th>
                    <th>Subdomain</th>
                    <th>Plan</th>
                    <th>Customer ID</th>
                    <th>Subscription ID</th>
                  </tr>
                </thead>
                <tbody>
                  {withSub.map((c) => (
                    <tr key={c.id} className="hover:bg-base-200 transition-colors">
                      <td data-label="Church" className="font-body font-medium">{c.name}</td>
                      <td data-label="Subdomain" className="font-body">{c.subdomain}</td>
                      <td data-label="Plan">
                        <span className="badge badge-primary badge-outline font-body text-xs capitalize">{c.plan}</span>
                      </td>
                      <td data-label="Customer ID" className="font-body text-sm font-mono text-base-content/70">{c.stripeCustomerId ?? "—"}</td>
                      <td data-label="Subscription ID" className="font-body text-sm font-mono text-base-content/70">{c.stripeSubscriptionId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
