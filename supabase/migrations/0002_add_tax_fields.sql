alter table public.transactions
  add column supply_value integer not null default 0 check (supply_value >= 0),
  add column vat_amount integer not null default 0 check (vat_amount >= 0),
  add column proof_type text;

alter table public.transactions
  add constraint transactions_proof_type_check
  check (
    proof_type is null
    or proof_type in ('세금계산서', '신용카드', '현금영수증(지출증빙)', '영수증없음')
  );
