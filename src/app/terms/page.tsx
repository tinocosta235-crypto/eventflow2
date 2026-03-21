export const dynamic = "force-static";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function PhormaMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="11" fill="url(#terms-grad)" />
      <circle cx="18" cy="18" r="10" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" fill="none" strokeDasharray="18 8" />
      <circle cx="18" cy="18" r="4.5" fill="rgba(255,255,255,0.95)" />
      <circle cx="18" cy="8"  r="2"   fill="rgba(255,255,255,0.55)" />
      <defs>
        <linearGradient id="terms-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7060CC" />
          <stop offset="100%" stopColor="#5A4AB0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhormaMark size={28} />
            <span className="text-base font-semibold text-gray-900 tracking-tight">Phorma</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Termini di Servizio</h1>
          <p className="text-sm text-gray-400">Aggiornati al: marzo 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-10">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              1. Descrizione del servizio
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Phorma è una piattaforma SaaS (Software as a Service) per la gestione professionale di eventi. Il servizio include strumenti per la gestione dei partecipanti, la creazione di moduli di registrazione, l&apos;invio di comunicazioni email, il check-in, la gestione della logistica e hospitality, l&apos;analisi dei dati e funzionalità di intelligenza artificiale per l&apos;ottimizzazione degli eventi. Phorma è destinato a organizzatori di eventi, agenzie e aziende che necessitano di una soluzione integrata per la gestione del ciclo di vita degli eventi.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              2. Accettazione dei termini
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Accedendo o utilizzando Phorma, dichiari di aver letto, compreso e accettato integralmente i presenti Termini di Servizio e la nostra{" "}
              <Link href="/privacy" className="text-[#7060CC] hover:underline">
                Informativa sulla Privacy
              </Link>
              . Se non accetti questi termini, non sei autorizzato a utilizzare la piattaforma. I termini possono essere aggiornati periodicamente; l&apos;utilizzo continuato del servizio dopo la pubblicazione delle modifiche costituisce accettazione delle stesse.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              3. Account e responsabilità
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Per utilizzare Phorma è necessario creare un account. L&apos;utente è responsabile di:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Fornire informazioni accurate, complete e aggiornate durante la registrazione.</li>
              <li>Mantenere riservate le credenziali di accesso e impedirne l&apos;uso non autorizzato.</li>
              <li>Tutte le attività svolte tramite il proprio account.</li>
              <li>Notificare immediatamente Phorma in caso di accesso non autorizzato o violazione della sicurezza dell&apos;account.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              Gli account possono essere gestiti da un&apos;organizzazione con diversi ruoli (Owner, Member, Viewer). Il titolare dell&apos;organizzazione è responsabile della gestione dei permessi dei membri del team.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              4. Utilizzo accettabile
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              L&apos;utente si impegna a non utilizzare Phorma per:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Attività illegali o contrarie all&apos;ordine pubblico e al buon costume.</li>
              <li>Inviare comunicazioni non richieste (spam), messaggi ingannevoli o contenuti fraudolenti.</li>
              <li>Violare la privacy o i diritti di terzi, incluse le normative sulla protezione dei dati personali.</li>
              <li>Raccogliere dati personali senza adeguata base giuridica o senza informare gli interessati.</li>
              <li>Tentare di compromettere la sicurezza della piattaforma, effettuare reverse engineering o accedere a risorse non autorizzate.</li>
              <li>Sovraccaricare i sistemi con richieste automatizzate eccessive.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              Phorma si riserva il diritto di sospendere o terminare l&apos;accesso agli account che violino queste condizioni.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              5. Dati e privacy
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Il trattamento dei dati personali è disciplinato dalla nostra{" "}
              <Link href="/privacy" className="text-[#7060CC] hover:underline">
                Informativa sulla Privacy
              </Link>
              , che costituisce parte integrante dei presenti Termini. L&apos;organizzatore che utilizza Phorma per raccogliere dati di partecipanti a eventi assume la responsabilità di garantire una base giuridica valida per tale raccolta e di informare adeguatamente gli interessati ai sensi del GDPR. Phorma agisce in qualità di responsabile del trattamento per conto dell&apos;organizzatore (titolare del trattamento) relativamente ai dati dei partecipanti.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              6. Servizio email
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Phorma integra il servizio di invio email tramite <strong>Resend</strong>. L&apos;utilizzo del servizio email è soggetto ai termini di utilizzo accettabile di Resend. Le email inviate tramite la piattaforma devono rispettare le normative anti-spam applicabili (incluso il Regolamento (UE) 2016/679 e il D.Lgs. 196/2003). Ogni piano di utilizzo prevede un numero massimo di email inviabili per periodo; il superamento dei limiti potrà comportare costi aggiuntivi o la sospensione temporanea del servizio. Phorma non garantisce la consegna delle email a causa di fattori esterni (filtri antispam del destinatario, provider email, ecc.).
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              7. Pagamenti
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Phorma è attualmente in fase di lancio. Alcuni piani a pagamento saranno introdotti in futuro. Prima dell&apos;attivazione di qualsiasi piano a pagamento, gli utenti saranno informati dei prezzi, della periodicità di fatturazione e delle condizioni di rimborso. I pagamenti saranno processati tramite provider terzi certificati (es. Stripe). Phorma si riserva il diritto di modificare i prezzi con un preavviso di almeno 30 giorni.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              8. Limitazione di responsabilità
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Phorma è fornito &quot;così com&apos;è&quot; (&quot;as is&quot;) senza garanzie di alcun tipo, esplicite o implicite. Nella misura massima consentita dalla legge applicabile, Phorma non è responsabile per danni indiretti, incidentali, speciali, consequenziali o punitivi derivanti dall&apos;utilizzo o dall&apos;impossibilità di utilizzo del servizio. La responsabilità massima complessiva di Phorma nei confronti dell&apos;utente non supera in ogni caso l&apos;importo pagato dall&apos;utente per il servizio nei 12 mesi precedenti l&apos;evento che ha dato origine alla responsabilità.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              9. Modifiche ai termini
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Phorma si riserva il diritto di modificare i presenti Termini di Servizio in qualsiasi momento. Le modifiche saranno comunicate agli utenti tramite email o notifica in-app con un preavviso di almeno <strong>15 giorni</strong> prima dell&apos;entrata in vigore, salvo modifiche urgenti imposte da obblighi legali. L&apos;utilizzo continuato del servizio dopo l&apos;entrata in vigore delle modifiche costituisce accettazione dei nuovi termini.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              10. Legge applicabile e foro competente
            </h2>
            <p className="text-gray-600 leading-relaxed">
              I presenti Termini di Servizio sono regolati dalla legge italiana. Per qualsiasi controversia relativa all&apos;interpretazione, esecuzione o risoluzione dei presenti termini, le parti concordano che il foro competente esclusivo è il <strong>Tribunale di Milano</strong>, salvo diversa normativa applicabile ai consumatori.
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-14 pt-6 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2026 Phorma. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
