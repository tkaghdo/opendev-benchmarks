insert into orgs (id, name, github_login, avatar_url, created_at) values
  ('vercel', 'Vercel', 'vercel', 'https://github.com/vercel.png', timestamptz '2015-10-21+00'),
  ('supabase', 'Supabase', 'supabase', 'https://github.com/supabase.png', timestamptz '2020-01-30+00'),
  ('prisma', 'Prisma', 'prisma', 'https://github.com/prisma.png', timestamptz '2016-01-01+00'),
  ('temporal', 'Temporal', 'temporalio', 'https://github.com/temporalio.png', timestamptz '2019-01-01+00'),
  ('hashicorp', 'HashiCorp', 'hashicorp', 'https://github.com/hashicorp.png', timestamptz '2013-01-01+00')
on conflict (id) do update set
  name = excluded.name,
  github_login = excluded.github_login,
  avatar_url = excluded.avatar_url;
