import { redirect } from 'next/navigation'

/** Rotina foi unificada com Hábitos numa única tela — mantém o link antigo funcionando. */
export default function RotinaPage() {
  redirect('/habitos?secao=rotina')
}
