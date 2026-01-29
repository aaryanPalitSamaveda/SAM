create table if not exists public.deal_documents (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_path text not null,
  file_type text,
  content_text text,
  created_at timestamptz not null default now()
);

alter table public.deal_documents enable row level security;

create policy "Allow all deal documents"
on public.deal_documents
for all
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('deal-documents', 'deal-documents', false)
on conflict (id) do nothing;

create policy "Allow all deal documents read"
on storage.objects
for select
using (bucket_id = 'deal-documents');

create policy "Allow all deal documents insert"
on storage.objects
for insert
with check (bucket_id = 'deal-documents');

create policy "Allow all deal documents update"
on storage.objects
for update
using (bucket_id = 'deal-documents')
with check (bucket_id = 'deal-documents');

create policy "Allow all deal documents delete"
on storage.objects
for delete
using (bucket_id = 'deal-documents');
