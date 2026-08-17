"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getOrg, searchOrgs } from "@opendev/catalog";

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const match = getOrg(query) ?? searchOrgs(query)[0];
    if (match) router.push(`/org/${match.id}`);
  }

  return (
    <form className="search" onSubmit={onSubmit}>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search organizations or repositories..."
        aria-label="Search organizations or repositories"
      />
      <button type="submit">Search</button>
    </form>
  );
}
