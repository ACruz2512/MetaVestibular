create table if not exists public.user_data (
    user_id uuid primary key references auth.users (id) on delete cascade,
    study jsonb not null default '{}'::jsonb,
    favorites jsonb not null default '[]'::jsonb,
    settings jsonb not null default '{}'::jsonb,
    avatar text,
    updated_at timestamptz not null default now()
);

create or replace function public.set_user_data_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists user_data_set_updated_at on public.user_data;
create trigger user_data_set_updated_at
before insert or update on public.user_data
for each row execute function public.set_user_data_updated_at();

alter table public.user_data enable row level security;

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data
    for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data
    for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own" on public.user_data
    for delete to authenticated using (auth.uid() = user_id);
