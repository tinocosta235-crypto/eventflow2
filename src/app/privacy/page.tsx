export const dynamic = "force-static";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function PhormaMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="11" fill="url(#priv-grad)" />
      <circle cx="18" cy="18" r="10" stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" fill="none" strokeDasharray="18 8" />
      <circle cx="18" cy="18" r="4.5" fill="rgba(255,255,255,0.95)" />
      <circle cx="18" cy="8"  r="2"   fill="rgba(255,255,255,0.55)" />
      <defs>
        <linearGradient id="priv-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7060CC" />
          <stop offset="100%" stopColor="#5A4AB0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Informativa sulla Privacy</h1>
          <p className="text-sm text-gray-400">Aggiornata al: marzo 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-10">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              1. Titolare del trattamento
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Il titolare del trattamento dei dati personali è <strong>[Nome Società]</strong> — con sede legale in [Indirizzo] — da completare prima della pubblicazione. Per qualsiasi questione relativa al trattamento dei tuoi dati puoi contattarci all&apos;indirizzo{" "}
              <a href="mailto:privacy@[dominio]" className="text-[#7060CC] hover:underline">
                privacy@[dominio]
              </a>
              .
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              2. Dati raccolti
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Raccogliamo le seguenti categorie di dati personali:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Dati anagrafici</strong>: nome, cognome.</li>
              <li><strong>Dati di contatto</strong>: indirizzo email, numero di telefono (se fornito).</li>
              <li><strong>Dati di iscrizione all&apos;evento</strong>: informazioni inserite nel modulo di registrazione, selezioni di sessioni, percorso di registrazione, codice registrazione, stato check-in.</li>
              <li><strong>Dati aziendali</strong>: nome azienda, ruolo, settore (se raccolti dal form dell&apos;evento).</li>
              <li><strong>Dati di utilizzo della piattaforma</strong>: log di accesso, dati di navigazione in forma aggregata, aperture e clic sulle email (tramite Resend).</li>
              <li><strong>Dati hospitality e viaggio</strong>: preferenze alberghiere, dati di trasporto, esigenze speciali (se forniti per la gestione logistica dell&apos;evento).</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              3. Finalità del trattamento
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">I tuoi dati sono trattati per le seguenti finalità:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Gestione delle iscrizioni agli eventi</strong>: registrazione, gestione liste d&apos;attesa, check-in, assegnazione a gruppi.</li>
              <li><strong>Comunicazioni relative all&apos;evento</strong>: invio di email di conferma, promemoria, aggiornamenti e follow-up tramite la piattaforma Phorma.</li>
              <li><strong>Analytics e ottimizzazione</strong>: monitoraggio del tasso di apertura email, engagement dei partecipanti e metriche di performance dell&apos;evento, in forma aggregata o individuale secondo le impostazioni dell&apos;organizzatore.</li>
              <li><strong>Gestione hospitality e logistica</strong>: organizzazione trasporti, prenotazioni alberghiere, gestione preferenze speciali.</li>
              <li><strong>Assistenza e supporto</strong>: risposta a richieste di assistenza e risoluzione di problemi.</li>
              <li><strong>Adempimenti legali</strong>: conservazione dei dati per obblighi fiscali e normativi.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              4. Base giuridica del trattamento
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">Il trattamento si fonda sulle seguenti basi giuridiche ai sensi dell&apos;art. 6 GDPR:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Consenso (art. 6, par. 1, lett. a)</strong>: per l&apos;invio di comunicazioni di marketing e per il trattamento di dati non strettamente necessari all&apos;erogazione del servizio.</li>
              <li><strong>Esecuzione di un contratto (art. 6, par. 1, lett. b)</strong>: per la gestione della registrazione all&apos;evento e la fornitura dei servizi richiesti.</li>
              <li><strong>Legittimo interesse (art. 6, par. 1, lett. f)</strong>: per il miglioramento della piattaforma, la prevenzione delle frodi e la sicurezza del servizio.</li>
              <li><strong>Obbligo legale (art. 6, par. 1, lett. c)</strong>: per adempiere agli obblighi di legge applicabili.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              5. Conservazione dei dati
            </h2>
            <p className="text-gray-600 leading-relaxed">
              I dati relativi alla partecipazione agli eventi sono conservati per la durata dell&apos;evento e per i <strong>2 anni successivi alla sua conclusione</strong>, salvo diversa indicazione dell&apos;organizzatore o obblighi normativi che richiedano periodi più lunghi (es. dati fiscali: 10 anni). Al termine del periodo di conservazione i dati vengono eliminati in modo sicuro o anonimizzati.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              6. Diritti dell&apos;interessato
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Ai sensi degli artt. 15–22 GDPR hai il diritto di:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Accesso</strong>: ottenere conferma che sia o meno in corso un trattamento di dati che ti riguardano e riceverne copia.</li>
              <li><strong>Rettifica</strong>: richiedere la correzione di dati inesatti o il completamento di dati incompleti.</li>
              <li><strong>Cancellazione (&quot;diritto all&apos;oblio&quot;)</strong>: ottenere la cancellazione dei tuoi dati personali, salvo obbligo legale di conservazione.</li>
              <li><strong>Portabilità</strong>: ricevere i tuoi dati in formato strutturato, di uso comune e leggibile da dispositivo automatico.</li>
              <li><strong>Opposizione</strong>: opporti al trattamento basato sul legittimo interesse in qualsiasi momento.</li>
              <li><strong>Limitazione</strong>: richiedere la limitazione del trattamento in determinati casi previsti dall&apos;art. 18 GDPR.</li>
              <li><strong>Revoca del consenso</strong>: revocare in qualsiasi momento il consenso precedentemente prestato, senza pregiudizio per la liceità del trattamento effettuato prima della revoca.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              Per esercitare i tuoi diritti scrivi a{" "}
              <a href="mailto:privacy@[dominio]" className="text-[#7060CC] hover:underline">
                privacy@[dominio]
              </a>
              . Hai inoltre il diritto di proporre reclamo all&apos;Autorità Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-[#7060CC] hover:underline">www.garanteprivacy.it</a>).
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              7. Trasferimento dei dati
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">I dati sono trattati prevalentemente all&apos;interno dell&apos;Unione Europea. In particolare:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>
                <strong>Database (Supabase / AWS eu-west-1)</strong>: i dati sono archiviati su infrastruttura AWS nella regione EU-WEST-1 (Irlanda), all&apos;interno dello Spazio Economico Europeo.
              </li>
              <li>
                <strong>Servizio email (Resend)</strong>: Resend Inc. ha sede negli Stati Uniti. Il trasferimento è tutelato mediante le <em>Standard Contractual Clauses</em> (Clausole Contrattuali Standard) approvate dalla Commissione Europea ai sensi dell&apos;art. 46 GDPR.
              </li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              8. Cookie
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Phorma utilizza esclusivamente <strong>cookie tecnici essenziali</strong> necessari al funzionamento della piattaforma (gestione della sessione di autenticazione). Non utilizziamo cookie di profilazione, cookie di terze parti a scopo pubblicitario né sistemi di tracciamento comportamentale.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              9. Contatti
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Per qualsiasi domanda relativa alla presente informativa o per esercitare i tuoi diritti, puoi contattarci all&apos;indirizzo email:{" "}
              <a href="mailto:privacy@[dominio]" className="text-[#7060CC] hover:underline">
                privacy@[dominio]
              </a>
              .
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-14 pt-6 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">© 2026 Phorma. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Termini di Servizio
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
