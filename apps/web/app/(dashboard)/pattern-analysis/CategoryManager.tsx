"use client";

import { useId, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getPatternAnalysisCategories, savePatternAnalysisCategories } from "./categories";

type Category = Awaited<ReturnType<typeof getPatternAnalysisCategories>>[number];

export function CategoryManager({ categories, onSaved, buttonClass }: {
  categories: Category[] | undefined;
  onSaved: (ids: number[]) => void;
  buttonClass: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState<number[]>([]);
  const save = useMutation({
    mutationFn: savePatternAnalysisCategories,
    onSuccess: (_, ids) => {
      onSaved(ids);
      dialog.current?.close();
    },
  });

  return (
    <>
      <button type="button" className={buttonClass} disabled={!categories}
        onClick={() => {
          save.reset();
          setDraft(categories?.filter(({ managed }) => managed).map(({ id }) => id) ?? []);
          dialog.current?.showModal();
        }}>
        Manage Categories
      </button>
      <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => {
        if (save.isPending) event.preventDefault();
      }} className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40">
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!save.isPending) save.mutate(draft);
        }}>
          <div className="border-b border-gray-200 p-4">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">Manage Categories</h2>
            <p className="mt-1 text-sm text-gray-600">Choose which categories appear in the filter.</p>
          </div>
          <div className="max-h-[50vh] space-y-4 overflow-y-auto p-4">
            {categories?.length === 0 && <p className="text-sm text-gray-600">No categories available.</p>}
            {(["EXPENSE", "INCOME"] as const).map((type) => {
              const options = categories?.filter((category) => category.type === type);
              if (!options?.length) return null;
              return (
                <fieldset key={type} className="grid gap-1 sm:grid-cols-2" disabled={save.isPending}>
                  <legend className="mb-1 text-sm font-semibold text-gray-900">
                    {type === "EXPENSE" ? "Expenses" : "Income"}
                  </legend>
                  {options.map(({ id, name }) => (
                    <label key={id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
                      <input type="checkbox" checked={draft.includes(id)} className="size-4 shrink-0 accent-indigo-600"
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setDraft((current) => checked ? [...current, id] : current.filter((value) => value !== id));
                        }} />
                      <span className="break-words">{name}</span>
                    </label>
                  ))}
                </fieldset>
              );
            })}
          </div>
          <div className="border-t border-gray-200 p-4">
            {save.isError && <p role="alert" className="mb-3 text-sm text-red-700">Couldn’t save categories. Try again.</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={buttonClass} disabled={save.isPending}
                onClick={() => dialog.current?.close()}>Cancel</button>
              <button type="submit" disabled={save.isPending}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {save.isPending ? "Saving…" : "Save categories"}
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
