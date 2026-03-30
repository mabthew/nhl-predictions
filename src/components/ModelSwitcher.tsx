"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ModelSwitcherProps {
  models: { id: string; name: string }[];
  currentModelId: string;
}

export default function ModelSwitcher({
  models,
  currentModelId,
}: ModelSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("model", e.target.value);
    router.push(`/history?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="model-select"
        className="text-xs font-semibold text-medium-gray uppercase tracking-wide"
      >
        Model
      </label>
      <select
        id="model-select"
        value={currentModelId}
        onChange={handleChange}
        className="text-sm font-semibold bg-charcoal text-white rounded-lg px-3 py-1.5 border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-espn-red"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id.toUpperCase()} - {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
