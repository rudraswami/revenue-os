export type Locale = "en" | "hi";

export const messages = {
  en: {
    nav: {
      home: "Home",
      connection: "Connection",
      agency: "Clients",
      partner: "Partner kit",
      conversations: "Conversations",
      contacts: "Contacts",
      pipeline: "Pipeline",
      tasks: "Tasks",
      analytics: "Analytics",
      intelligence: "Intelligence",
      campaigns: "Campaigns",
      automations: "Automations",
      settings: "Settings",
    },
    groups: {
      overview: "Overview",
      engage: "Engage",
      intelligence: "Intelligence",
      automate: "Automate",
      growth: "Growth",
    },
    common: {
      workspace: "Workspace",
      loading: "Loading…",
      save: "Save",
      cancel: "Cancel",
      switchClient: "Switch to client",
      addClient: "Add client",
      enableAgency: "Enable agency mode",
      language: "Language",
      english: "English",
      hindi: "Hindi",
    },
    agency: {
      title: "Agency clients",
      description: "Manage multiple client workspaces from one Pro hub — WhatsApp health, pipeline, and handoffs at a glance.",
      empty: "No client workspaces yet",
      emptyHint: "Add a client to provision a isolated Growvisi workspace you can switch into.",
      proRequired: "Agency mode requires the Pro plan.",
      clientsUsed: "clients",
    },
    partner: {
      title: "Partner install kit",
      description: "Meta Business Agent + Growvisi — the stack Indian SMBs need for WhatsApp revenue.",
    },
  },
  hi: {
    nav: {
      home: "होम",
      connection: "कनेक्शन",
      agency: "क्लाइंट",
      partner: "पार्टनर किट",
      conversations: "बातचीत",
      contacts: "संपर्क",
      pipeline: "पाइपलाइन",
      tasks: "कार्य",
      analytics: "एनालिटिक्स",
      intelligence: "इंटेलिजेंस",
      campaigns: "अभियान",
      automations: "ऑटोमेशन",
      settings: "सेटिंग्स",
    },
    groups: {
      overview: "ओवरव्यू",
      engage: "एंगेज",
      intelligence: "इंटेलिजेंस",
      automate: "ऑटोमेट",
      growth: "ग्रोथ",
    },
    common: {
      workspace: "वर्कस्पेस",
      loading: "लोड हो रहा है…",
      save: "सेव",
      cancel: "रद्द करें",
      switchClient: "क्लाइंट पर जाएं",
      addClient: "क्लाइंट जोड़ें",
      enableAgency: "एजेंसी मोड चालू करें",
      language: "भाषा",
      english: "English",
      hindi: "हिंदी",
    },
    agency: {
      title: "एजेंसी क्लाइंट",
      description: "एक Pro हब से कई क्लाइंट वर्कस्पेस — WhatsApp स्वास्थ्य, पाइपलाइन और हैंडऑफ एक नज़र में।",
      empty: "अभी कोई क्लाइंट वर्कस्पेस नहीं",
      emptyHint: "क्लाइंट जोड़ें — अलग Growvisi वर्कस्पेस बनेगा जिसमें आप स्विच कर सकते हैं।",
      proRequired: "एजेंसी मोड के लिए Pro प्लान जरूरी है।",
      clientsUsed: "क्लाइंट",
    },
    partner: {
      title: "पार्टनर इंस्टॉल किट",
      description: "Meta Business Agent + Growvisi — WhatsApp राजस्व के लिए भारतीय SMB स्टैक।",
    },
  },
} as const;

export type MessageTree = (typeof messages)["en"];

export function resolveLocale(raw?: string | null): Locale {
  return raw === "hi" ? "hi" : "en";
}

export function createTranslator(locale: Locale) {
  const table = messages[locale];
  return function t(path: string): string {
    const parts = path.split(".");
    let node: unknown = table;
    for (const part of parts) {
      if (node && typeof node === "object" && part in node) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return path;
      }
    }
    return typeof node === "string" ? node : path;
  };
}
