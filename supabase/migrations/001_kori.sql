-- Kori: user-owned budget data. Apply to a new Supabase project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  country text not null default 'Burkina Faso'
    check (country in ('Burkina Faso','Bénin','Côte d’Ivoire','Guinée-Bissau','Mali','Niger','Sénégal','Togo')),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  label text not null check (char_length(label) between 1 and 120),
  category text not null check (category in ('Alimentation','Transport','Maison','Factures','Santé','Revenus','Autre')),
  entry_type text not null check (entry_type in ('expense','income')),
  amount_xof bigint not null check (amount_xof > 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  category text not null check (category in ('Alimentation','Transport','Maison','Factures','Santé','Autre')),
  month_start date not null,
  limit_xof bigint not null check (limit_xof > 0),
  created_at timestamptz not null default now(),
  unique(user_id, category, month_start)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 100),
  target_xof bigint not null check (target_xof > 0),
  saved_xof bigint not null default 0 check (saved_xof >= 0),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('wave','cinetpay')),
  provider_reference text not null unique,
  amount_xof bigint not null check (amount_xof > 0),
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('plus')),
  status text not null check (status in ('active','expired','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  provider text not null check (provider in ('wave','cinetpay')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;

revoke all on public.profiles, public.transactions, public.monthly_budgets,
  public.savings_goals, public.payments, public.subscriptions from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.transactions,
  public.monthly_budgets, public.savings_goals to authenticated;
grant select on public.payments, public.subscriptions to authenticated;
grant all on public.profiles, public.transactions, public.monthly_budgets,
  public.savings_goals, public.payments, public.subscriptions to service_role;

create policy profiles_read_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy transactions_read_own on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy transactions_insert_own on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy transactions_update_own on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete_own on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy budgets_read_own on public.monthly_budgets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy budgets_insert_own on public.monthly_budgets for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy budgets_update_own on public.monthly_budgets for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy budgets_delete_own on public.monthly_budgets for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy goals_read_own on public.savings_goals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy goals_insert_own on public.savings_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy goals_update_own on public.savings_goals for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy goals_delete_own on public.savings_goals for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy payments_read_own on public.payments for select to authenticated
  using ((select auth.uid()) = user_id);
create policy subscriptions_read_own on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists transactions_user_date_idx
  on public.transactions(user_id, occurred_at desc);
create index if not exists budgets_user_month_idx
  on public.monthly_budgets(user_id, month_start);
create index if not exists goals_user_created_idx
  on public.savings_goals(user_id, created_at desc);

-- Atomically grant 30 days of Plus only once for each confirmed, server-created payment.
create or replace function public.activate_kori_payment(p_reference text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_provider text;
  v_amount bigint;
  v_now timestamptz := now();
  v_start timestamptz;
begin
  select user_id, provider, amount_xof
    into v_user, v_provider, v_amount
    from public.payments
    where provider_reference = p_reference and status = 'pending'
    for update;
  if not found or v_amount <= 0 then
    return false;
  end if;

  update public.payments
    set status = 'paid', completed_at = v_now
    where provider_reference = p_reference;

  select greatest(v_now, ends_at) into v_start
    from public.subscriptions
    where user_id = v_user and status = 'active';
  if v_start is null then
    v_start := v_now;
  end if;

  insert into public.subscriptions(user_id, plan, status, starts_at, ends_at, provider, updated_at)
    values (v_user, 'plus', 'active', v_start, v_start + interval '30 days', v_provider, v_now)
    on conflict (user_id) do update set
      plan = excluded.plan,
      status = excluded.status,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      provider = excluded.provider,
      updated_at = excluded.updated_at;
  return true;
end;
$$;

revoke all on function public.activate_kori_payment(text) from public, anon, authenticated;
grant execute on function public.activate_kori_payment(text) to service_role;
