// Cube is infrastructure, not the product story.
// REST callers must send org_id / customer_id or role=internal|public.
// Embedded Canvas SQL traffic uses cube_sql and is isolated at embed-session RLS.

const ORG_CUBES = new Set([
  "pull_requests",
  "issues",
  "commits",
  "reviews",
  "repos",
  "contributors",
  "orgs",
  "contributor_first_seen",
  "contributor_concentration",
]);

function collectCubeNames(query) {
  const names = [];
  const collect = (member) => {
    if (typeof member === "string" && member.includes(".")) {
      names.push(member.split(".")[0]);
    }
  };
  const walkFilters = (filters) => {
    for (const filter of filters ?? []) {
      collect(filter.member);
      walkFilters(filter.and);
      walkFilters(filter.or);
    }
  };
  for (const member of query.measures ?? []) collect(member);
  for (const member of query.dimensions ?? []) collect(member);
  for (const td of query.timeDimensions ?? []) collect(td.dimension);
  walkFilters(query.filters);
  return [...new Set(names)];
}

module.exports = {
  checkSqlAuth: async (_req, username) => {
    const expectedUser = process.env.CUBEJS_SQL_USER || "cube";
    if (username === expectedUser) {
      return {
        password: process.env.CUBEJS_SQL_PASSWORD || process.env.CUBEJS_API_SECRET,
        securityContext: { cube_sql: true },
      };
    }
    throw new Error("Access denied");
  },
  queryRewrite: (query, { securityContext }) => {
    const ctx = securityContext ?? {};
    const tenantId = ctx.customer_id ?? ctx.org_id ?? ctx.tenant_id;
    const role = ctx.role;
    query.filters = query.filters ?? [];

    if (tenantId) {
      for (const cube of collectCubeNames(query)) {
        if (ORG_CUBES.has(cube)) {
          query.filters.push({
            member: `${cube}.orgId`,
            operator: "equals",
            values: [String(tenantId)],
          });
        }
      }
      return query;
    }

    if (ctx.cube_sql === true || role === "internal" || role === "public") {
      return query;
    }

    throw new Error("Governed metrics require securityContext.customer_id or role=internal|public");
  },
};
