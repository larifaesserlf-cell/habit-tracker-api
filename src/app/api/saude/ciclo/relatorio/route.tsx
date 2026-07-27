import type { NextRequest } from 'next/server'
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CicloMenstrual, FluxoMenstrual, RegistroCiclo } from '@/lib/supabase/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FLUXO_LABEL: Record<FluxoMenstrual, string> = {
  nenhum: 'Nenhum',
  leve: 'Leve',
  moderado: 'Moderado',
  intenso: 'Intenso',
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDataBR(data: string) {
  return data.split('-').reverse().join('/')
}

/** Desloca uma data ISO (YYYY-MM-DD) por `n` meses pra trás, em UTC. */
function subtrairMeses(dataISO: string, n: number): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1 - n, dia)).toISOString().slice(0, 10)
}

/** Duração inclusiva em dias entre duas datas ISO. */
function duracaoDias(dataInicio: string, dataFim: string): number {
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(dataFim) - Date.parse(dataInicio)) / msPorDia) + 1
}

async function resolverPeriodo(
  searchParams: URLSearchParams,
  buscarDataMaisAntiga: () => Promise<string>
): Promise<{ inicio: string; fim: string } | null> {
  const periodo = searchParams.get('periodo')
  const hoje = hojeISO()

  if (periodo === 'ultimo_mes') return { inicio: subtrairMeses(hoje, 1), fim: hoje }
  if (periodo === '3_meses') return { inicio: subtrairMeses(hoje, 3), fim: hoje }
  if (periodo === '6_meses') return { inicio: subtrairMeses(hoje, 6), fim: hoje }
  if (periodo === 'historico') return { inicio: await buscarDataMaisAntiga(), fim: hoje }
  if (periodo === 'customizado') {
    const inicio = searchParams.get('inicio')
    const fim = searchParams.get('fim')
    const dataValida = /^\d{4}-\d{2}-\d{2}$/
    if (!inicio || !fim || !dataValida.test(inicio) || !dataValida.test(fim) || fim < inicio) return null
    return { inicio, fim }
  }
  return null
}

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  titulo: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitulo: { fontSize: 10, color: '#555555', marginBottom: 20 },
  secaoTitulo: { fontSize: 12, fontWeight: 700, marginTop: 18, marginBottom: 8 },
  tabelaHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #999999',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tabelaLinha: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #dddddd',
    paddingVertical: 4,
  },
  colInicio: { width: '25%', fontWeight: 700 },
  colFim: { width: '25%' },
  colDuracao: { width: '25%' },
  colHeader: { fontWeight: 700, color: '#555555' },
  registro: {
    borderBottom: '0.5pt solid #dddddd',
    paddingVertical: 6,
  },
  registroCabecalho: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  registroData: { fontWeight: 700 },
  registroDetalhe: { color: '#555555', marginBottom: 2 },
  registroNota: { color: '#1a1a1a', marginTop: 2 },
  vazio: { color: '#777777', fontStyle: 'italic' },
})

function RelatorioCicloDocument({
  inicio,
  fim,
  ciclos,
  registros,
}: {
  inicio: string
  fim: string
  ciclos: CicloMenstrual[]
  registros: RegistroCiclo[]
}) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.titulo}>Relatório de Ciclo Menstrual</Text>
        <Text style={pdfStyles.subtitulo}>
          Período: {formatDataBR(inicio)} a {formatDataBR(fim)}
        </Text>

        <Text style={pdfStyles.secaoTitulo}>Ciclos</Text>
        {ciclos.length === 0 ? (
          <Text style={pdfStyles.vazio}>Nenhum ciclo registrado nesse período.</Text>
        ) : (
          <View>
            <View style={pdfStyles.tabelaHeader}>
              <Text style={[pdfStyles.colInicio, pdfStyles.colHeader]}>Início</Text>
              <Text style={[pdfStyles.colFim, pdfStyles.colHeader]}>Fim</Text>
              <Text style={[pdfStyles.colDuracao, pdfStyles.colHeader]}>Duração</Text>
            </View>
            {ciclos.map((ciclo) => (
              <View key={ciclo.id} style={pdfStyles.tabelaLinha}>
                <Text style={pdfStyles.colInicio}>{formatDataBR(ciclo.data_inicio)}</Text>
                <Text style={pdfStyles.colFim}>{ciclo.data_fim ? formatDataBR(ciclo.data_fim) : 'Em andamento'}</Text>
                <Text style={pdfStyles.colDuracao}>
                  {ciclo.data_fim ? `${duracaoDias(ciclo.data_inicio, ciclo.data_fim)} dias` : '—'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={pdfStyles.secaoTitulo}>Registros diários</Text>
        {registros.length === 0 ? (
          <Text style={pdfStyles.vazio}>Nenhum registro relevante nesse período.</Text>
        ) : (
          <View>
            {registros.map((registro) => (
              <View key={registro.id} style={pdfStyles.registro}>
                <View style={pdfStyles.registroCabecalho}>
                  <Text style={pdfStyles.registroData}>{formatDataBR(registro.data)}</Text>
                  <Text>
                    {FLUXO_LABEL[registro.fluxo]}
                    {registro.tpm ? ' · TPM' : ''}
                  </Text>
                </View>
                {registro.humor && <Text style={pdfStyles.registroDetalhe}>Humor: {registro.humor}</Text>}
                {registro.sintomas && registro.sintomas.length > 0 && (
                  <Text style={pdfStyles.registroDetalhe}>Sintomas: {registro.sintomas.join(', ')}</Text>
                )}
                {registro.notas && <Text style={pdfStyles.registroNota}>{registro.notas}</Text>}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Não autenticado.', { status: 401 })
  }

  const periodoResolvido = await resolverPeriodo(request.nextUrl.searchParams, async () => {
    // "Todo o histórico": usa a data mais antiga entre ciclos e registros em
    // vez de um limite arbitrário, pra o cabeçalho do PDF mostrar um período
    // real em vez de "01/01/1900". Sem nenhum dado, cai no dia de hoje.
    const [{ data: cicloMaisAntigo }, { data: registroMaisAntigo }] = await Promise.all([
      supabase
        .from('ciclos_menstruais')
        .select('data_inicio')
        .eq('user_id', user.id)
        .order('data_inicio', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('registros_ciclo')
        .select('data')
        .eq('user_id', user.id)
        .order('data', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])
    const candidatos = [cicloMaisAntigo?.data_inicio, registroMaisAntigo?.data].filter(
      (d): d is string => Boolean(d)
    )
    return candidatos.length > 0 ? candidatos.sort()[0] : hojeISO()
  })
  if (!periodoResolvido) {
    return new Response('Período inválido.', { status: 400 })
  }
  const { inicio, fim } = periodoResolvido

  const [{ data: ciclosData }, { data: registrosData }] = await Promise.all([
    supabase
      .from('ciclos_menstruais')
      .select('*')
      .eq('user_id', user.id)
      .lte('data_inicio', fim)
      .or(`data_fim.is.null,data_fim.gte.${inicio}`)
      .order('data_inicio', { ascending: true }),
    supabase
      .from('registros_ciclo')
      .select('*')
      .eq('user_id', user.id)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data', { ascending: true }),
  ])

  const ciclos = (ciclosData ?? []) as CicloMenstrual[]
  const registros = ((registrosData ?? []) as RegistroCiclo[]).filter(
    (r) => r.tpm || r.fluxo !== 'nenhum' || Boolean(r.notas && r.notas.trim().length > 0)
  )

  const buffer = await renderToBuffer(
    <RelatorioCicloDocument inicio={inicio} fim={fim} ciclos={ciclos} registros={registros} />
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ciclo-menstrual_${inicio}_a_${fim}.pdf"`,
    },
  })
}
