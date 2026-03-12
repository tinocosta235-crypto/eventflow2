import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt) return NextResponse.json({ error: "Prompt richiesto" }, { status: 400 });

  // In production: call Claude API here
  // For now return a meaningful placeholder
  const html = buildPlaceholderPage(prompt);
  return NextResponse.json({ html });
}

function buildPlaceholderPage(prompt: string) {
  const isConference = /conferenza|forum|summit|congresso/i.test(prompt);
  const isWorkshop = /workshop|laboratorio|corso/i.test(prompt);
  const isWebinar = /webinar|online|virtuale/i.test(prompt);

  const title = isConference
    ? "Conferenza 2025"
    : isWorkshop ? "Workshop Professionale"
    : isWebinar ? "Webinar Online"
    : "Evento 2025";

  const gradient = isWorkshop
    ? "from-emerald-600 to-teal-700"
    : isWebinar ? "from-purple-600 to-indigo-700"
    : "from-blue-600 to-indigo-700";

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 font-sans">
  <section class="bg-gradient-to-br ${gradient} text-white py-24 px-4">
    <div class="max-w-4xl mx-auto text-center">
      <p class="inline-block bg-white/20 px-4 py-1 rounded-full text-sm mb-6">📅 2025 · Italia</p>
      <h1 class="text-5xl font-bold mb-5">${title}</h1>
      <p class="text-xl text-white/80 mb-8 max-w-xl mx-auto">Generato da Phorma AI sulla base del tuo prompt: "${prompt.slice(0, 80)}..."</p>
      <a href="#form" class="inline-block bg-white text-blue-700 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition">Iscriviti Ora →</a>
    </div>
  </section>

  <section class="bg-white py-12 px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl font-bold text-gray-900 mb-4">Perché partecipare</h2>
      <div class="grid grid-cols-3 gap-6 mt-8">
        <div class="p-6 rounded-xl border hover:shadow-md transition"><div class="text-3xl mb-3">🎯</div><h3 class="font-semibold text-gray-800 mb-2">Contenuti di Qualità</h3><p class="text-sm text-gray-500">Speaker di livello internazionale</p></div>
        <div class="p-6 rounded-xl border hover:shadow-md transition"><div class="text-3xl mb-3">🤝</div><h3 class="font-semibold text-gray-800 mb-2">Networking</h3><p class="text-sm text-gray-500">Connettiti con i migliori professionisti</p></div>
        <div class="p-6 rounded-xl border hover:shadow-md transition"><div class="text-3xl mb-3">💡</div><h3 class="font-semibold text-gray-800 mb-2">Innovazione</h3><p class="text-sm text-gray-500">Le ultime tendenze del settore</p></div>
      </div>
    </div>
  </section>

  <section id="form" class="py-16 px-4 bg-gray-900">
    <div class="max-w-md mx-auto">
      <h2 class="text-3xl font-bold text-white text-center mb-8">Registrati Gratuitamente</h2>
      <form class="bg-white rounded-2xl p-6 space-y-4">
        <input type="text" placeholder="Nome *" class="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Cognome *" class="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="email" placeholder="Email *" class="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" placeholder="Azienda" class="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" class="w-full bg-blue-600 text-white rounded-lg py-3 font-bold hover:bg-blue-700 transition">Invia Iscrizione</button>
      </form>
    </div>
  </section>
</body>
</html>`;
}
