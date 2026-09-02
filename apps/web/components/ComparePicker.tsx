"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type OrgOption = { id: string; name: string };

export function ComparePicker({ orgs }: { orgs: OrgOption[] }) {
  const router = useRouter();
  const [left, setLeft] = useState(orgs[0]?.id ?? "");
  const [right, setRight] = useState(orgs[1]?.id ?? orgs[0]?.id ?? "");
  const valid = Boolean(left && right && left !== right);

  const rightOptions = useMemo(() => orgs.filter((org) => org.id !== left), [orgs, left]);

  function onLeft(id: string) {
    setLeft(id);
    if (right === id) {
      const next = orgs.find((org) => org.id !== id);
      if (next) setRight(next.id);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    router.push(`/compare/${left}/${right}`);
  }

  if (orgs.length < 2) {
    return <p className="empty-state">Need at least two organizations in the warehouse to compare.</p>;
  }

  return (
    <form className="compare-picker" onSubmit={onSubmit}>
      <label>
        <span className="kicker">Organization A</span>
        <select value={left} onChange={(event) => onLeft(event.target.value)}>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="kicker">Organization B</span>
        <select value={right} onChange={(event) => setRight(event.target.value)}>
          {rightOptions.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={!valid}>
        Compare
      </button>
    </form>
  );
}
