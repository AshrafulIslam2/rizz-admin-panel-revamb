"use client";

import { useEffect, useState } from "react";
import { useGetPagesQuery, useCreatePageTreeMutation, useUpdatePageMutation, useDeletePageMutation } from "@/lib/slices/apiSlice";

type PageId = number | string;

type PageRecord = {
  id: PageId;
  title: string;
  slug: string;
  parentId: PageId | null;
  isVisible: boolean;
  order: number;
  children?: PageRecord[];
};

type PageDraft = {
  id?: PageId;
  title: string;
  slug: string;
  parentId: PageId | null;
  isVisible: boolean;
  order: number;
  children: PageDraft[];
};

type Toast = {
  id: number;
  title: string;
  description: string;
  tone: "success" | "error";
};

type PagePayload = {
  title: string;
  slug: string;
  parentId: PageId | null;
  isVisible: boolean;
  order: number;
};

type DraftPath = number[];

function sortPages(pages: PageRecord[]): PageRecord[] {
  return [...pages]
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
    .map((page) => ({
      ...page,
      children: page.children ? sortPages(page.children) : [],
    }));
}

function pageToDraft(page: PageRecord): PageDraft {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    parentId: page.parentId,
    isVisible: page.isVisible,
    order: page.order,
    children: (page.children ?? []).map(pageToDraft),
  };
}

function draftToRecord(draft: PageDraft): PageRecord {
  if (draft.id === undefined || draft.id === null) {
    throw new Error("Cannot convert an unsaved draft into a record.");
  }

  return {
    id: draft.id,
    title: draft.title,
    slug: draft.slug,
    parentId: draft.parentId,
    isVisible: draft.isVisible,
    order: draft.order,
    children: draft.children.map(draftToRecord),
  };
}

function createEmptyDraft(parentId: PageId | null = null): PageDraft {
  return {
    title: "",
    slug: "",
    parentId,
    isVisible: true,
    order: 0,
    children: [],
  };
}

function cloneDraft(draft: PageDraft): PageDraft {
  return {
    id: draft.id,
    title: draft.title,
    slug: draft.slug,
    parentId: draft.parentId,
    isVisible: draft.isVisible,
    order: draft.order,
    children: draft.children.map(cloneDraft),
  };
}

function updateDraftAtPath(
  draft: PageDraft,
  path: DraftPath,
  updater: (node: PageDraft) => PageDraft,
): PageDraft {
  if (path.length === 0) {
    return updater(draft);
  }

  const [index, ...rest] = path;

  return {
    ...draft,
    children: draft.children.map((child, childIndex) => {
      if (childIndex !== index) {
        return child;
      }

      return updateDraftAtPath(child, rest, updater);
    }),
  };
}

function appendChildAtPath(draft: PageDraft, path: DraftPath, child: PageDraft): PageDraft {
  if (path.length === 0) {
    return {
      ...draft,
      children: [...draft.children, child],
    };
  }

  const [index, ...rest] = path;

  return {
    ...draft,
    children: draft.children.map((existingChild, childIndex) => {
      if (childIndex !== index) {
        return existingChild;
      }

      return appendChildAtPath(existingChild, rest, child);
    }),
  };
}

function removeChildAtPath(draft: PageDraft, path: DraftPath): PageDraft {
  if (path.length === 0) {
    return draft;
  }

  if (path.length === 1) {
    const [index] = path;
    return {
      ...draft,
      children: draft.children.filter((_, childIndex) => childIndex !== index),
    };
  }

  const [index, ...rest] = path;

  return {
    ...draft,
    children: draft.children.map((child, childIndex) => {
      if (childIndex !== index) {
        return child;
      }

      return removeChildAtPath(child, rest);
    }),
  };
}

function collectDraftIds(draft?: PageDraft | null): PageId[] {
  if (!draft) {
    return [];
  }

  return [
    ...(draft.id !== undefined && draft.id !== null ? [draft.id] : []),
    ...draft.children.flatMap((child) => collectDraftIds(child)),
  ];
}

function collectRecordIds(page: PageRecord): PageId[] {
  return [
    ...(page.children ?? []).flatMap((child) => collectRecordIds(child)),
    page.id,
  ];
}

function flattenParentOptions(
  pages: PageRecord[],
  excludedIds: Set<PageId>,
  depth = 0,
): Array<{ id: PageId; title: string; depth: number }> {
  return pages.flatMap((page) => {
    const current = excludedIds.has(page.id)
      ? []
      : [{ id: page.id, title: page.title, depth }];

    return [
      ...current,
      ...flattenParentOptions(page.children ?? [], excludedIds, depth + 1),
    ];
  });
}

function PageCard({
  page,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: {
  page: PageRecord;
  depth: number;
  onEdit: (page: PageRecord) => void;
  onDelete: (page: PageRecord) => void;
  onAddChild: (page: PageRecord) => void;
}) {
  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/40 backdrop-blur"
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{page.title}</h3>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
              {page.isVisible ? "Visible" : "Hidden"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>/{page.slug}</span>
            <span>Order {page.order}</span>
            <span>ID {page.id}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAddChild(page)}
            className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900 transition hover:border-teal-300 hover:bg-teal-100"
          >
            Add child
          </button>
          <button
            type="button"
            onClick={() => onEdit(page)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(page)}
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
          >
            Delete
          </button>
        </div>
      </div>

      {(page.children ?? []).length > 0 ? (
        <div className="mt-4 space-y-3 border-l border-slate-200 pl-4">
          {page.children?.map((child) => (
            <PageCard
              key={child.id}
              page={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChildEditor({
  node,
  path,
  onChange,
  onAddChild,
  onRemove,
  canRemove,
}: {
  node: PageDraft;
  path: DraftPath;
  onChange: (path: DraftPath, field: keyof PageDraft, value: string | number | boolean | null) => void;
  onAddChild: (path: DraftPath) => void;
  onRemove: (path: DraftPath) => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm shadow-slate-200/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Title</span>
            <input
              value={node.title}
              onChange={(event) => onChange(path, "title", event.target.value)}
              placeholder="Child title"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-teal-400 focus:outline-none"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slug</span>
            <input
              value={node.slug}
              onChange={(event) => onChange(path, "slug", event.target.value)}
              placeholder="child-slug"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-teal-400 focus:outline-none"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order</span>
            <input
              type="number"
              value={node.order}
              onChange={(event) => onChange(path, "order", Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-teal-400 focus:outline-none"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <span className="font-medium">Visible</span>
            <button
              type="button"
              onClick={() => onChange(path, "isVisible", !node.isVisible)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                node.isVisible ? "bg-teal-600" : "bg-slate-300"
              }`}
              aria-pressed={node.isVisible}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                  node.isVisible ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAddChild(path)}
            className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900 transition hover:border-teal-300 hover:bg-teal-100"
          >
            Add child
          </button>
          {canRemove ? (
            <button
              type="button"
              onClick={() => onRemove(path)}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {node.children.length > 0 ? (
        <div className="mt-4 space-y-3 border-l border-slate-200 pl-4">
          {node.children.map((child, index) => (
            <ChildEditor
              key={child.id ?? `${path.join("-")}-${index}-${child.slug}-${index}`}
              node={child}
              path={[...path, index]}
              onChange={onChange}
              onAddChild={onAddChild}
              onRemove={onRemove}
              canRemove
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PageForm({
  draft,
  mode,
  parentOptions,
  onChange,
  onAddChild,
  onRemoveChild,
  onSubmit,
  onCancel,
  onCreateChild,
}: {
  draft: PageDraft;
  mode: "create" | "edit";
  parentOptions: Array<{ id: PageId; title: string; depth: number }>;
  onChange: (path: DraftPath, field: keyof PageDraft, value: string | number | boolean | null) => void;
  onAddChild: (path: DraftPath) => void;
  onRemoveChild: (path: DraftPath) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onCreateChild: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
            {mode === "create" ? "New page" : "Edit page"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {draft.title || (mode === "create" ? "Untitled page" : "Select a page field")}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateChild}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Add root child
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Title</span>
          <input
            value={draft.title}
            onChange={(event) => onChange([], "title", event.target.value)}
            placeholder="Page title"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slug</span>
          <input
            value={draft.slug}
            onChange={(event) => onChange([], "slug", event.target.value)}
            placeholder="page-slug"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Parent page</span>
          <select
            value={String(draft.parentId ?? "")}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "") {
                onChange([], "parentId", null);
                return;
              }

              const parsedNumericId = Number(value);
              onChange([], "parentId", Number.isNaN(parsedNumericId) ? value : parsedNumericId);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
          >
            <option value="">Top level</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {`${"— ".repeat(option.depth)}${option.title}`}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order</span>
          <input
            type="number"
            value={draft.order}
            onChange={(event) => onChange([], "order", Number(event.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Visible</p>
          <p className="text-xs text-slate-500">Toggle whether this page appears in the tree.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([], "isVisible", !draft.isVisible)}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
            draft.isVisible ? "bg-teal-600" : "bg-slate-300"
          }`}
          aria-pressed={draft.isVisible}
        >
          <span
            className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
              draft.isVisible ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Nested children</h3>
            <p className="text-sm text-slate-500">Add or edit child pages directly from this form.</p>
          </div>
          <button
            type="button"
            onClick={() => onAddChild([])}
            className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-900 transition hover:border-teal-300 hover:bg-teal-100"
          >
            Add child
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {draft.children.length > 0 ? (
            draft.children.map((child, index) => (
              <ChildEditor
                key={child.id ?? `${index}-${child.slug}`}
                node={child}
                path={[index]}
                onChange={onChange}
                onAddChild={onAddChild}
                onRemove={onRemoveChild}
                canRemove
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
              No child pages yet. Use Add child to build a nested tree.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {mode === "create" ? "Create page" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Reset form
        </button>
      </div>
    </section>
  );
}

export function PagesAdminPanel() {
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [draft, setDraft] = useState<PageDraft | null>(null);
  const [originalDraft, setOriginalDraft] = useState<PageDraft | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [deleteTarget, setDeleteTarget] = useState<PageRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Redux RTK Query hooks
  const { data: pagesData, isLoading, error: pagesError, refetch: refetchPages } = useGetPagesQuery();
  const [createPageTree] = useCreatePageTreeMutation();
  const [updatePage] = useUpdatePageMutation();
  const [deletePage] = useDeletePageMutation();

  function pushToast(tone: Toast["tone"], title: string, description: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, tone, title, description }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }

  // Update pages state when Redux query data changes
  useEffect(() => {
    if (pagesData) {
      setPages(pagesData);
      if (pagesError) {
        const message = pagesError instanceof Error ? pagesError.message : "Unable to load pages.";
        setLoadError(message);
        pushToast("error", "Failed to load pages", message);
      } else {
        setLoadError(null);
      }
    }
  }, [pagesData, pagesError]);

  function openCreate(parentId: PageId | null = null) {
    setMode("create");
    setDraft(createEmptyDraft(parentId));
    setOriginalDraft(null);
  }

  function openEdit(page: PageRecord) {
    const nextDraft = pageToDraft(page);
    setMode("edit");
    setDraft(cloneDraft(nextDraft));
    setOriginalDraft(nextDraft);
  }

  function handleFieldChange(
    path: DraftPath,
    field: keyof PageDraft,
    value: string | number | boolean | null,
  ) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return updateDraftAtPath(current, path, (node) => {
        if (field === "children") {
          return node;
        }

        return {
          ...node,
          [field]: value,
        } as PageDraft;
      });
    });
  }

  function handleAddChild(path: DraftPath) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return appendChildAtPath(current, path, createEmptyDraft(null));
    });
  }

  function handleRemoveChild(path: DraftPath) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return removeChildAtPath(current, path);
    });
  }

  async function deleteSubtree(page: PageRecord) {
    for (const child of page.children ?? []) {
      await deleteSubtree(child);
    }

    try {
      await deletePage(page.id).unwrap();
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to delete ${page.title}`;
      throw new Error(message);
    }
  }

  async function syncDraft(node: PageDraft, parentId: PageId | null, originalNode: PageDraft | null): Promise<PageId> {
    const payload: PagePayload = {
      title: node.title.trim(),
      slug: node.slug.trim(),
      parentId,
      isVisible: node.isVisible,
      order: Number.isNaN(Number(node.order)) ? 0 : Number(node.order),
    };

    try {
      const response = node.id
        ? await updatePage({ id: node.id, data: payload }).unwrap()
        : await createPageTree(payload).unwrap();

      const savedId = response?.id ?? node.id;

      if (savedId === undefined || savedId === null) {
        throw new Error("The API did not return a page id.");
      }

      const originalChildren = originalNode?.children ?? [];
      const originalChildrenById = new Map<PageId, PageDraft>(
        originalChildren.flatMap((child) => (child.id !== undefined && child.id !== null ? [[child.id, child]] : [])),
      );
      const currentChildrenIds = new Set<PageId>(
        node.children.flatMap((child) => (child.id !== undefined && child.id !== null ? [child.id] : [])),
      );

      for (const child of node.children) {
        const childOriginal = child.id !== undefined && child.id !== null ? originalChildrenById.get(child.id) ?? null : null;
        await syncDraft(child, savedId, childOriginal ?? null);
      }

      for (const originalChild of originalChildren) {
        if (originalChild.id === undefined || originalChild.id === null) {
          continue;
        }

        if (currentChildrenIds.has(originalChild.id)) {
          continue;
        }

        const subtree: PageDraft = {
          id: originalChild.id,
          title: originalChild.title,
          slug: originalChild.slug,
          parentId: originalChild.parentId,
          isVisible: originalChild.isVisible,
          order: originalChild.order,
          children: originalChild.children ?? [],
        };

        await deleteSubtree(draftToRecord(subtree));
      }

      return savedId;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync draft";
      throw new Error(message);
    }
  }

  async function handleSubmit() {
    if (!draft) {
      return;
    }

    const title = draft.title.trim();
    const slug = draft.slug.trim();

    if (!title || !slug) {
      pushToast("error", "Missing required fields", "Title and slug are required before saving.");
      return;
    }

    setIsSaving(true);

    try {
      await syncDraft(draft, draft.parentId, originalDraft);
      pushToast(
        "success",
        mode === "create" ? "Page created" : "Page updated",
        `${title} has been saved successfully.`,
      );
      setDraft(null);
      setOriginalDraft(null);
      // Refetch pages from Redux store
      await refetchPages();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the page.";
      pushToast("error", "Save failed", message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) {
      return;
    }

    setDeleteBusy(true);

    try {
      await deleteSubtree(deleteTarget);
      pushToast("success", "Page deleted", `${deleteTarget.title} was removed.`);

      if (draft?.id === deleteTarget.id) {
        setDraft(null);
        setOriginalDraft(null);
      }

      setDeleteTarget(null);
      // Refetch pages from Redux store
      await refetchPages();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete the page.";
      pushToast("error", "Delete failed", message);
    } finally {
      setDeleteBusy(false);
    }
  }

  const excludedParentIds = new Set<PageId>([
    ...(draft?.id !== undefined && draft?.id !== null ? [draft.id] : []),
    ...collectDraftIds(draft),
  ]);
  const parentOptions = flattenParentOptions(pages, excludedParentIds);

  return (
    <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <header className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Pages</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  Manage nested pages without leaving the dashboard.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Build, rearrange, and hide page trees from one simple admin screen.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  New page
                </button>
                <button
                  type="button"
                  onClick={() => void refetchPages()}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          </header>

          {loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]" id="pages">
            <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Page tree</h3>
                  <p className="text-sm text-slate-500">Indentation shows parent and child relationships.</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  {pages.length} root items
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  </div>
                ) : pages.length > 0 ? (
                  pages.map((page) => (
                    <PageCard
                      key={page.id}
                      page={page}
                      depth={0}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onAddChild={(target) => openCreate(target.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
                    No pages found. Create the first page to start building the tree.
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-6">
              {draft ? (
                <PageForm
                  draft={draft}
                  mode={mode}
                  parentOptions={parentOptions}
                  onChange={handleFieldChange}
                  onAddChild={handleAddChild}
                  onRemoveChild={handleRemoveChild}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setDraft(null);
                    setOriginalDraft(null);
                  }}
                  onCreateChild={() => handleAddChild([])}
                />
              ) : (
                <section className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Page editor</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">Open a page to edit it here.</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                    Create a new page, edit an existing one, or add children directly from the tree.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openCreate()}
                      className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Create page
                    </button>
                    <button
                      type="button"
                      onClick={() => void refetchPages()}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Reload tree
                    </button>
                  </div>
                </section>
              )}

              <section className="rounded-[28px] border border-white/70 bg-slate-950 px-5 py-5 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Workflow</p>
                <div className="mt-4 grid gap-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">1. Load the tree from GET /api/pages.</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">2. Use the editor to create, edit, or nest pages.</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">3. Save, delete, and refresh without leaving the screen.</div>
                </div>
              </section>
            </div>
          </div>
        </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.24)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Confirm delete</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Delete {deleteTarget.title}?</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              This removes the selected page. If it has descendants, they are removed as part of the same cleanup.
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirmed()}
                disabled={deleteBusy}
                className="rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteBusy ? "Deleting..." : "Delete page"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed right-4 top-4 z-[60] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 shadow-[0_16px_50px_rgba(15,23,42,0.18)] backdrop-blur ${
              toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <p className="text-sm font-semibold">{toast.title}</p>
            <p className="mt-1 text-sm leading-5 opacity-90">{toast.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}