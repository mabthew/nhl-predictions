"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteModelButton({ modelId, modelName }: { modelId: string; modelName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modelId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">Delete {modelName}?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded cursor-pointer disabled:opacity-50 transition-colors"
        >
          {deleting ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-medium-gray hover:text-charcoal cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:text-red-700 cursor-pointer transition-colors"
      aria-label={`Delete ${modelName}`}
    >
      Delete
    </button>
  );
}
