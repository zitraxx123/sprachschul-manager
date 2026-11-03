-- Migration: Stripe-Abonnement (Zuordnung Schule <-> Stripe-Kunde / Abo)

alter table public.organizations
    add column if not exists stripe_customer_id text,
    add column if not exists stripe_subscription_id text,
    add column if not exists subscription_status text;

create index if not exists idx_organizations_stripe_customer on public.organizations (stripe_customer_id);

-- Tarif- und Stripe-Felder dürfen nur Service-Role / SQL-Editor ändern (auth.uid() ist dort null)
create or replace function public.protect_organization_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is not null then
        if tg_op = 'INSERT' then
            new.plan := 'free';
            new.stripe_customer_id := null;
            new.stripe_subscription_id := null;
            new.subscription_status := null;
        elsif new.plan is distinct from old.plan
           or new.stripe_customer_id is distinct from old.stripe_customer_id
           or new.stripe_subscription_id is distinct from old.stripe_subscription_id
           or new.subscription_status is distinct from old.subscription_status then
            raise exception 'plan_change_forbidden';
        end if;
    end if;
    return new;
end;
$$;
