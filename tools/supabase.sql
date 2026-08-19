-- Dziennik serii dla aplikacji „Plan 12 tygodni”.
-- Uruchom raz: Supabase → SQL Editor → wklej całość → Run.
--
-- Model dostępu: tabela jest ZAMKNIĘTA dla klucza publikowalnego (RLS włączony,
-- zero polityk, odebrane uprawnienia). Cały ruch idzie przez dwie funkcje
-- security definer, które wymagają kodu planu. Znasz kod — masz swój dziennik;
-- nie znasz — nie ma czego przeglądać ani zgadywać.

create table if not exists public.sety (
  plan_key text        not null check (char_length(plan_key) between 12 and 64),
  week     smallint    not null check (week between 1 and 12),
  day      text        not null check (day in ('A', 'B', 'C')),
  ex       smallint    not null check (ex between 1 and 30),
  set_no   smallint    not null check (set_no between 1 and 12),
  reps     smallint             check (reps between 0 and 50),
  kg       numeric(5,2)         check (kg >= 0 and kg <= 500),
  ts       timestamptz not null default now(),
  primary key (plan_key, week, day, ex, set_no)
);

alter table public.sety enable row level security;
revoke all on table public.sety from anon, authenticated;

-- ── odczyt ────────────────────────────────────────────────────────────────────
create or replace function public.log_pull(p_key text)
returns table (
  week smallint, day text, ex smallint, set_no smallint,
  reps smallint, kg numeric, ts timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.week, s.day, s.ex, s.set_no, s.reps, s.kg, s.ts
  from public.sety s
  where char_length(p_key) >= 12
    and s.plan_key = p_key;
$$;

-- ── zapis ─────────────────────────────────────────────────────────────────────
-- Przyjmuje tablicę wierszy. Przy kolizji wygrywa nowszy znacznik czasu,
-- więc telefon i laptop mogą wysyłać niezależnie.
create or replace function public.log_push(p_key text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if char_length(p_key) < 12 then
    raise exception 'nieprawidlowy kod planu';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
    raise exception 'nieprawidlowa paczka danych';
  end if;

  insert into public.sety (plan_key, week, day, ex, set_no, reps, kg, ts)
  select
    p_key,
    (r ->> 'week')::smallint,
    r ->> 'day',
    (r ->> 'ex')::smallint,
    (r ->> 'set_no')::smallint,
    nullif(r ->> 'reps', '')::smallint,
    nullif(r ->> 'kg', '')::numeric,
    coalesce((r ->> 'ts')::timestamptz, now())
  from jsonb_array_elements(p_rows) as r
  on conflict (plan_key, week, day, ex, set_no) do update
    set reps = excluded.reps,
        kg   = excluded.kg,
        ts   = excluded.ts
    where excluded.ts > public.sety.ts;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.log_pull(text)        from public;
revoke all on function public.log_push(text, jsonb) from public;
grant execute on function public.log_pull(text)        to anon, authenticated;
grant execute on function public.log_push(text, jsonb) to anon, authenticated;

-- Sprawdzenie po uruchomieniu — powinno zwrócić pustą tabelę, nie błąd:
--   select * from public.log_pull('TEST-KOD-1234');

-- ── stan planu ────────────────────────────────────────────────────────────────
-- Tydzień, E1RM, historia korekt i własne ciężary ćwiczeń dodatkowych. Jeden
-- wiersz na dziennik, nadpisywany w całości — wygrywa nowszy znacznik czasu.
create table if not exists public.stan (
  plan_key text        primary key check (char_length(plan_key) between 12 and 64),
  dane     jsonb       not null,
  ts       timestamptz not null default now()
);

alter table public.stan enable row level security;
revoke all on table public.stan from anon, authenticated;

create or replace function public.stan_pull(p_key text)
returns table (dane jsonb, ts timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.dane, s.ts
  from public.stan s
  where char_length(p_key) >= 12
    and s.plan_key = p_key;
$$;

-- Zwraca znacznik czasu, ktory FAKTYCZNIE stoi w bazie po zapisie. Rozstrzyga
-- zegar serwera, nie urzadzenia: zegary telefonu i laptopa potrafia sie rozjechac
-- o minuty, a wtedy starszy zapis wygrywalby z nowszym.
create or replace function public.stan_push(p_key text, p_dane jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  wynik timestamptz;
begin
  if char_length(p_key) < 12 then
    raise exception 'nieprawidlowy kod planu';
  end if;
  if jsonb_typeof(p_dane) <> 'object' or pg_column_size(p_dane) > 200000 then
    raise exception 'nieprawidlowe dane stanu';
  end if;

  insert into public.stan (plan_key, dane, ts)
  values (p_key, p_dane, now())
  on conflict (plan_key) do update
    set dane = excluded.dane, ts = excluded.ts;

  select s.ts into wynik from public.stan s where s.plan_key = p_key;
  return wynik;
end;
$$;

revoke all on function public.stan_pull(text)                        from public;
revoke all on function public.stan_push(text, jsonb)                 from public;
grant execute on function public.stan_pull(text)                     to anon, authenticated;
grant execute on function public.stan_push(text, jsonb)              to anon, authenticated;
