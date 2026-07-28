-- Life OS — Financeiro: status de pagamento (pago/pendente) por transação
-- Base pra separar valores "realizados" de "previstos" no resumo do mês.

alter table public.transacoes
  add column if not exists status_pagamento text
    check (status_pagamento in ('pago', 'pendente'));

-- Preenche o histórico existente com a mesma regra automática que passa a
-- valer daqui pra frente (data <= hoje = pago, senão pendente) — sem isso,
-- toda transação lançada antes desta migration ficaria sem status e sumiria
-- dos totais "realizado"/"previsto" até a usuária tocar em cada uma.
update public.transacoes
set status_pagamento = case when data <= current_date then 'pago' else 'pendente' end
where status_pagamento is null;
