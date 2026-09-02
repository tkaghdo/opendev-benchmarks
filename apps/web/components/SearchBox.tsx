"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

type SearchOrg = { id: string; name: string; githubLogin: string };
type SearchRepo = { id: string; orgId: string; name: string; fullName: string };

type SearchPayload = {
  orgs: SearchOrg[];
  repos: SearchRepo[];
  source?: string;
};

export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [results, setResults] = useState<SearchPayload>({ orgs: [], repos: [] });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults({ orgs: [], repos: [] });
      setEmpty(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = (await res.json()) as SearchPayload;
        const none = (body.orgs?.length ?? 0) === 0 && (body.repos?.length ?? 0) === 0;
        setResults({ orgs: body.orgs ?? [], repos: body.repos ?? [] });
        setEmpty(none);
        setOpen(true);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setResults({ orgs: [], repos: [] });
        setEmpty(true);
        setOpen(true);
      }
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const firstOrg = results.orgs[0];
    const firstRepo = results.repos[0];
    if (firstOrg) {
      router.push(`/org/${firstOrg.id}`);
      return;
    }
    if (firstRepo) {
      router.push(`/org/${firstRepo.orgId}/repos`);
      return;
    }
    setOpen(true);
    setEmpty(true);
  }

  return (
    <form className="search" onSubmit={onSubmit} role="search" ref={rootRef}>
      <div className="search-wrap">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          placeholder="Search organizations or repositories..."
          aria-label="Search organizations or repositories"
          aria-autocomplete="list"
          aria-controls={listId}
          autoComplete="off"
        />
        {open && query.trim() && (
          <div className="search-results" id={listId} role="listbox">
            {empty ? (
              <p className="search-empty">No organizations or repositories match “{query.trim()}”.</p>
            ) : (
              <>
                {results.orgs.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    className="search-hit"
                    onClick={() => router.push(`/org/${org.id}`)}
                  >
                    <strong>{org.name}</strong>
                    <span>{org.githubLogin}</span>
                  </button>
                ))}
                {results.repos.map((repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    className="search-hit"
                    onClick={() => router.push(`/org/${repo.orgId}/repos`)}
                  >
                    <strong>{repo.fullName}</strong>
                    <span>Repository</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      <button type="submit">Search</button>
    </form>
  );
}
