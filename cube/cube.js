// Cube is infrastructure, not the product story.
// REST callers must send org_id / customer_id or role=internal|public.
// Embedded Canvas SQL traffic uses cube_sql and is isolated at embed-session RLS.

const tenantMember = "pull_requests.orgId";

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
    const tenantId = securityContext?.customer_id ?? securityContext?.org_id ?? securityContext?.tenant_id;
    const role = securityContext?.role;
    query.filters = query.filters ?? [];
    if (tenantId) {
      query.filters.push({
        member: tenantMember,
        operator: "equals",
        values: [String(tenantId)],
      });
      return query;
    }
    if (securityContext?.cube_sql === true || role === "internal" || role === "public") {
      return query;
    }
    throw new Error("Governed metrics require securityContext.customer_id or role=internal|public");
  },
};
