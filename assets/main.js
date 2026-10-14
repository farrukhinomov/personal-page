const T = {
  en: {
    "nav.flowpro":"FlowPro","nav.about":"About","nav.contact":"Contact",
    "hero.eyebrow":"C# / .NET developer · Saarbrücken, Germany",
    "hero.title":"I build software that German companies use every day.",
    "hero.lead":"Professional developer since 2019, coding since 2009. Right now I am building FlowPro: time tracking and leave planning on a modern stack.",
    "hero.cta":"Talk to me about FlowPro",
    "fp.intro":"A web system for time tracking (Zeiterfassung), leave planning and employee self-service – made for German small and mid-sized companies.",
    "fp.c1.t":"Time tracking","fp.c1.p":"Clock in and out, see working hours and overtime in one place.",
    "fp.c2.t":"Leave planning","fp.c2.p":"Request, approve and plan vacation without spreadsheets.",
    "fp.c3.t":"Self-service","fp.c3.p":"Employees check their own hours and leave. Less work for HR.",
    "fp.pilot":"Looking for pilot companies: free, weekly use, direct line to the developer.",
    "about.h":"About",
    "about.p":"I am a C#/.NET developer living in Saarbrücken. I work with .NET on the backend and React + Vite on the frontend. I speak Tajik, Russian and English fluently, and German at B1 – improving every month.",
    "contact.h":"Contact",
    "contact.p":"Run a company and tired of paper or Excel time sheets? Write me – I will answer personally."
  },
  de: {
    "nav.flowpro":"FlowPro","nav.about":"Über mich","nav.contact":"Kontakt",
    "hero.eyebrow":"C#/.NET-Entwickler · Saarbrücken",
    "hero.title":"Ich entwickle Software, die deutsche Firmen jeden Tag nutzen.",
    "hero.lead":"Seit 2019 beruflich Entwickler, programmiere seit 2009. Aktuell baue ich FlowPro: Zeiterfassung und Urlaubsplanung auf einem modernen Technologie-Stack.",
    "hero.cta":"Sprechen wir über FlowPro",
    "fp.intro":"Ein Web-System für Zeiterfassung, Urlaubsplanung und Mitarbeiter-Self-Service – für kleine und mittlere Unternehmen in Deutschland.",
    "fp.c1.t":"Zeiterfassung","fp.c1.p":"Kommen und Gehen buchen, Arbeitszeit und Überstunden auf einen Blick.",
    "fp.c2.t":"Urlaubsplanung","fp.c2.p":"Urlaub beantragen, genehmigen und planen – ohne Excel-Listen.",
    "fp.c3.t":"Self-Service","fp.c3.p":"Mitarbeiter sehen ihre Stunden und ihren Urlaub selbst. Weniger Aufwand für die Personalabteilung.",
    "fp.pilot":"Ich suche Pilotfirmen: kostenlos, wöchentliche Nutzung, direkter Draht zum Entwickler.",
    "about.h":"Über mich",
    "about.p":"Ich bin C#/.NET-Entwickler und lebe in Saarbrücken. Im Backend arbeite ich mit .NET, im Frontend mit React und Vite. Ich spreche fließend Tadschikisch, Russisch und Englisch sowie Deutsch auf B1-Niveau – und werde jeden Monat besser.",
    "contact.h":"Kontakt",
    "contact.p":"Sie führen eine Firma und haben genug von Papier- oder Excel-Stundenzetteln? Schreiben Sie mir – ich antworte persönlich."
  }
};
const btn = document.getElementById("lang");
function setLang(l){
  document.documentElement.lang = l;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = T[l][el.dataset.i18n]; });
  btn.textContent = l === "en" ? "DE" : "EN";
  try { localStorage.setItem("lang", l); } catch (e) {}
}
btn.addEventListener("click", () => setLang(document.documentElement.lang === "en" ? "de" : "en"));
let start = (navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
try { start = localStorage.getItem("lang") || start; } catch (e) {}
setLang(start);
document.getElementById("y").textContent = new Date().getFullYear();
