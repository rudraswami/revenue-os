import { PageHeader } from "@/components/dashboard/page-header";

export default function PricingLoading() {
  return (
    <div className="dashboard-page max-w-[1100px]">
      <PageHeader
        title="Plans & pricing"
        description="Transparent INR pricing. 14-day free trial — upgrade anytime with Razorpay."
      />
      <div className="mb-8 h-32 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
