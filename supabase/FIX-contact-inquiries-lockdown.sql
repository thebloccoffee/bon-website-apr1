-- Drop every policy on contact_inquiries (prod names differ from repo),
-- then allow insert only. Reads go through service_role (/api/admin-*).
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'contact_inquiries'
  loop
    execute format('drop policy %I on public.contact_inquiries', p.policyname);
  end loop;
end $$;

alter table public.contact_inquiries enable row level security;

create policy "Public can submit contact"
  on public.contact_inquiries for insert
  with check (true);

-- Shows every remaining policy so we can spot other open ones.
select tablename, policyname, cmd, roles::text, qual
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
