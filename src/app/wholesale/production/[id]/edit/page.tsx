import CostingForm from "@/components/costing-form";

export const metadata = { title: "Edit Product Costing" };

export default async function EditProductCostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="rounded-[32px] bg-slate-950 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-400">Wholesale · Production</p>
          <h1 className="mt-2 text-2xl font-semibold">Edit Product Costing</h1>
          <p className="mt-1 text-sm text-slate-400">
            Open any tab and change only what you need — untouched values stay exactly as saved.
          </p>
        </header>
        {/* Identical component to Add; passing an id switches it to edit mode. */}
        <CostingForm costingId={id} />
      </div>
    </div>
  );
}
