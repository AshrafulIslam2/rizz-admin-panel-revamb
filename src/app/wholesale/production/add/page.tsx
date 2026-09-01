import CostingForm from "@/components/costing-form";

export const metadata = { title: "Add Product Costing" };

export default function AddProductCostingPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="rounded-[32px] bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Wholesale · Production</p>
          <h1 className="mt-2 text-2xl font-semibold">Add Product Costing</h1>
          <p className="mt-1 text-sm text-slate-400">
            Product → Upper → Sole → Factory → Wholesale → Retail Cost → Retail Price → Review.
          </p>
        </header>
        {/* Same component as edit mode — one form, two routes. */}
        <CostingForm />
      </div>
    </div>
  );
}
