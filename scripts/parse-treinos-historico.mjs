/**
 * Parser do histórico de treinos (texto bruto anotado pela usuária) pra SQL
 * de importação idempotente. Gera o corpo do arquivo
 * supabase/migrations/20260830120000_life_os_importa_historico_treinos.sql
 * — rodar de novo (`node scripts/parse-treinos-historico.mjs`) só é
 * necessário se o texto bruto abaixo mudar; a saída é sempre a mesma.
 *
 * Formato esperado de cada bloco:
 *   DD de Mês de AAAA
 *   Treino N
 *   Nome do exercício - SxR - carga
 *   ...
 *   (linha em branco separa sessões)
 *
 * A carga fica sempre em texto (nunca convertida pra número), porque varia
 * demais de formato: "50kg", "55+55" (peso por lado), "10+ 10" (espaço
 * solto), "Barra", "Livre", "2.5+2.5" (decimal). Dedupe de sessão é por
 * (data, nome do treino) — o número do treino se repete ao longo do tempo
 * de propósito (é a mesma ficha evoluindo), então NÃO serve de identificador
 * único sozinho.
 */

const textoBruto = `
08 de Junho de 2026
Treino 01
Cadeira Extensora - 4x12 - 50kg
Leg Press - 4x12 - 55+55
Cadeira Flexora - 4x12 - 25kg
Mesa Flexora - 4x12 - 15kg
Coice Polia - 4x12 - 25kg
Agachamento Smith - 4x12 - 10+10
Panturrilha Sentado - 4x12 - 15kg

09 de Junho de 2026
Treino 03
Puxada Alta Aberta - 4x12 - 25kg
Voador Inverso - 4x12 - 20kg
Elevação Lateral Halteres - 4x12 - 5+5
Desenvolvimento Halteres - 4x12 - 7+7
Tríceps Corda Polia - 4x12 - 25kg
Tríceps Francês Corda - 4x12 - 10kg
Bíceps Halteres- 4x12 - 6+6

15 de Junho de 2026
Treino 04
Cadeira Extensora - 4x10 - 60kg
Leg Press - 4x10 - 60+60
Cadeira Flexora - 4x10 - 30kg
Mesa Flexora - 4x12 - 20kg
Coice Polia - 4x12 - 25kg
Agachamento Smith - 4x10- 15+15
Panturrilha Sentado - 4x12 - 15kg

16 de Junho de 2026
Treino 05
Puxada Alta Aberta - 4x10 - 30kg
Voador Inverso - 4x10 - 30kg
Elevação Lateral Halteres - 4x10 - 6+6
Desenvolvimento Halteres - 4x10 -8+8
Tríceps Corda Polia - 4x12 - 25kg
Tríceps Francês Corda - 4x12 - 10kg
Bíceps Halteres- 4x10 - 7+7

18 de Junho de 2026
Treino 06
Elevação Pélvica - 4x12 - 20+20
Búlgaro - 4x12 - 10
Stiff Barra - 3x12 - 7.5 + 7.5
Cadeira Flexora - 4x12 - 30
Cadeira Extensora Unilateral - 4x12 - 20
Panturrilha em Pé - 4x12 - Livre

19 de Junho de 2026
Treino 07
Remada Baixa - 4x12 - 30kg
Remada Barra - 4x12 - 22.5kg
Biceps Máquina - 4x12 - 15kg
Tríceps Maquina- 4x12 - 35kg
Supino Fechado - 4x12 - Barra
Elevação Frontal Polia - 4x10 - 10kg
Desenvolvimento Máquina - 4x12 - 20kg

23 de Junho de 2026
Treino 08
Puxada Alta Aberta - 4x15- 25kg
Voador Inverso - 4x15 - 20kg
Elevação Lateral Halteres - 4x15- 5+5
Desenvolvimento Halteres - 4x15 -7+7
Tríceps Corda Polia - 4x15 - 20kg
Tríceps Francês Corda - 4x15 - 10kg
Bíceps Halteres- 4x15 - 5+5

24 de Junho de 2026
Treino 09
Cadeira Extensora - 4x15 - 30kg
Leg Press - 4x15 - 30+30
Cadeira Flexora - 4x15 - 20kg
Mesa Flexora - 4x15- 10kg
Coice Polia - 4x15 - 25kg
Agachamento Smith - 4x12- 10+10
Panturrilha Sentado - 4x15- 10kg

19 de Junho de 2026
Treino 10
Remada Baixa - 4x15 - 25kg
Remada Barra - 4x12 - 22.5kg
Biceps Máquina - 4x15 - 10kg
Tríceps Maquina- 4x15 - 30kg
Supino Fechado - 4x12 - Barra
Elevação Frontal Polia - 4x12- 10kg
Desenvolvimento Máquina - 4x15 - 20kg

26 de Junho de 2026
Treino 11
Elevação Pélvica - 4x15 - 20+20
Búlgaro - 4x15 - 5
Stiff Barra - 4x - Barra
Cadeira Flexora - 4x15- 20
Cadeira Extensora Unilateral - 4x15 - 10
Panturrilha em Pé - 4x15 - 10kg

30 de Junho de 2026
Treino 12
Cadeira Extensora - 4x12 - 60kg
Leg Press - 4x12 - 60+60
Cadeira Flexora - 4x12 - 30kg
Mesa Flexora - 4x12 - 20kg
Coice Polia - 4x12 - 25kg
Agachamento Livre - 4x12 - 15+15
Panturrilha Sentado - 4x12 - 20kg

01 de Julho de 2026
Treino 13
Puxada Alta Aberta - 4x12 - 30kg
Voador Inverso - 4x12 - 20kg
Elevação Lateral Halteres - 4x12 - 6+6
Desenvolvimento Halteres - 4x12 - 8+8
Tríceps Corda Polia - 4x12 - 25kg
Tríceps Francês Corda - 4x12 - 15kg
Bíceps Halteres- 4x12 - 7+7

02 de Julho de 2026
Treino 14
Elevação Pélvica - 4x12 - 25+25
Búlgaro Smith - 4x12 - 10
Stiff Smith - 4x12 - 10+ 10
Cadeira Flexora - 4x12 - 40
Cadeira Extensora Unilateral - 4x12 - 20
Panturrilha em Pé - 4x12 - 10+10

03 de Julho de 2026
Treino 15
Remada Baixa - 4x12 - 30kg
Remada Barra - 4x12 - 22.5kg
Biceps Máquina - 4x12 - 15kg
Tríceps Maquina- 4x12 - 35kg
Supino Fechado - 4x12 - Barra
Elevação Frontal Polia - 4x10 - 10kg
Desenvolvimento Máquina - 4x12 - 20kg

06 de Julho de 2026
Treino 16
Cadeira Extensora - 4x10 - 70kg
Leg Press - 4x10 - 70+70
Cadeira Flexora - 4x10 - 40kg
Mesa Flexora - 4x12 - 30kg
Coice Polia - 4x12 - 30kg
Agachamento Livre - 4x10- 20+20
Panturrilha Sentado - 4x10 - 20kg

07 de Julho de 2026
Treino 17
Puxada Alta Aberta - 4x8 - 8kg
Voador Inverso - 4x8 - 40kg
Elevação Lateral Halteres - 4x10 - 7+7
Desenvolvimento Halteres - 4x10 -9+9
Tríceps Corda Polia - 4x10 - 30kg
Tríceps Francês Corda - 4x10- 15kg
Bíceps Halteres- 4x8 - 8+8

09 de Julho de 2026
Treino 15
Remada Baixa - 4x10 - 40kg
Remada Barra - 4x10 - 27.5kg
Biceps Máquina - 4x10 - 15kg
Tríceps Maquina- 4x10 - 45kg
Supino Fechado - 4x10 - 2.5 +2.5
Elevação Frontal Polia - 4x10 - 10kg
Desenvolvimento Barra - 4x10 - 2.5 + 2.5

10 de Julho de 2026
Treino 16
Elevação Pélvica - 4x10 - 20+20
Búlgaro Smith - 4x10 - 12.5 +12.5
Stiff Barra - 4x10 - 10+ 10
Cadeira Flexora - 4x10 - 50
Cadeira Extensora Unilateral - 4x10- 30
Panturrilha em Pé - 4x10 - 50

14 de Julho de 2026
Treino 17
Puxada Alta Aberta - 4x8 - 8kg
Voador Inverso - 4x8 - 40kg
Elevação Lateral Halteres - 4x10 - 7+7
Desenvolvimento Halteres - 4x10 -9+9
Tríceps Corda Polia - 4x10 - 30kg
Tríceps Francês Corda - 4x10- 15kg
Bíceps Halteres- 4x8 - 8+8

16 de Julho de 2026
Treino 16
Cadeira Extensora - 4x10 - 80kg
Leg Press - 4x10 - 70+70
Cadeira Flexora - 4x10 - 50kg
Mesa Flexora - 4x12 - 30kg
Coice Polia - 4x12 - 30kg
Agachamento Livre - 4x10- 20+20
Panturrilha Sentado - 4x10 - 25kg
`

const EMAIL_USUARIA = 'faesserlarissa@gmail.com'

const MESES = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
}

const REGEX_DATA = /^(\d{1,2}) de ([a-zçãéô]+) de (\d{4})$/i

function paraISO(linha) {
  const m = REGEX_DATA.exec(linha)
  if (!m) return null
  const dia = m[1].padStart(2, '0')
  const mesNome = m[2].toLowerCase()
  const mes = MESES[mesNome]
  if (!mes) throw new Error(`Mês desconhecido: "${mesNome}" na linha "${linha}"`)
  const ano = m[3]
  return `${ano}-${String(mes).padStart(2, '0')}-${dia}`
}

function parseTreinos(texto) {
  const linhas = texto.split('\n').map((l) => l.trim())
  const sessoes = []
  let atual = null

  for (const linha of linhas) {
    if (linha === '') continue // linha em branco só separa sessões

    const iso = paraISO(linha)
    if (iso) {
      atual = { data: iso, nome: null, exercicios: [] }
      sessoes.push(atual)
      continue
    }

    if (!atual) {
      throw new Error(`Linha inesperada antes de qualquer data: "${linha}"`)
    }

    if (atual.nome === null) {
      atual.nome = linha // "Treino N"
      continue
    }

    // Linha de exercício: normaliza espaços extras antes de separar, já que
    // o texto original tem hífen ora colado ("Halteres- 4x12"), ora com
    // espaço duplo, mas sempre exatamente 2 hifens delimitando 3 campos.
    const normalizada = linha.replace(/\s+/g, ' ').trim()
    const partes = normalizada.split(/\s*-\s*/)
    if (partes.length < 3) {
      throw new Error(`Não consegui separar nome/séries/carga em: "${linha}" (sessão ${atual.data} ${atual.nome})`)
    }
    const [nome, seriesReps, ...resto] = partes
    atual.exercicios.push({
      nome: nome.trim(),
      seriesReps: seriesReps.trim(),
      // join de volta por segurança, caso a carga em si algum dia tenha um
      // hífen (não acontece neste dataset, mas evita perder dado calado)
      carga: resto.join(' - ').trim(),
    })
  }

  if (atual && atual.nome === null) {
    throw new Error(`Sessão de ${atual.data} ficou sem nome de treino (linha "Treino N" faltando).`)
  }

  return sessoes
}

function escapeSql(str) {
  return str.replace(/'/g, "''")
}

function gerarSql(sessoes) {
  const blocos = sessoes.map((sessao) => {
    const valuesExercicios = sessao.exercicios
      .map((e, i) => `    ('${escapeSql(e.nome)}', '${escapeSql(e.seriesReps)}', '${escapeSql(e.carga)}', ${i + 1})`)
      .join(',\n')

    return `with sessao as (
  insert into public.treinos (user_id, data, nome)
  select u.id, '${sessao.data}', '${escapeSql(sessao.nome)}'
  from auth.users u
  where u.email = '${EMAIL_USUARIA}'
    and not exists (
      select 1 from public.treinos t
      where t.user_id = u.id and t.data = '${sessao.data}' and t.nome = '${escapeSql(sessao.nome)}'
    )
  returning id
)
insert into public.exercicios_treino (treino_id, nome, series_reps, carga, ordem)
select sessao.id, v.nome, v.series_reps, v.carga, v.ordem
from sessao
cross join (
  values
${valuesExercicios}
) as v (nome, series_reps, carga, ordem);`
  })

  return blocos.join('\n\n')
}

const sessoes = parseTreinos(textoBruto)

console.error(`Sessões encontradas: ${sessoes.length}`)
console.error(`Total de exercícios: ${sessoes.reduce((soma, s) => soma + s.exercicios.length, 0)}`)
for (const s of sessoes) {
  console.error(`  ${s.data} — ${s.nome} (${s.exercicios.length} exercícios)`)
}

console.log(gerarSql(sessoes))
