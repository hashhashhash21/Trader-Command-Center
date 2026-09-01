create table if not exists tcc_observations (
  id bigserial primary key,
  symbol text not null,
  observed_at timestamptz not null default now(),
  price numeric not null,
  state text,
  evidence_score numeric,
  quality_score numeric,
  regime text,
  mtf jsonb,
  derivatives jsonb,
  orderflow jsonb,
  anomaly jsonb,
  provenance jsonb,
  outcome_15m numeric,
  outcome_1h numeric,
  outcome_4h numeric,
  evaluated_15m boolean not null default false,
  evaluated_1h boolean not null default false,
  evaluated_4h boolean not null default false
);
create index if not exists tcc_observations_symbol_time_idx on tcc_observations(symbol, observed_at desc);
create index if not exists tcc_observations_due_idx on tcc_observations(observed_at) where not evaluated_4h;
