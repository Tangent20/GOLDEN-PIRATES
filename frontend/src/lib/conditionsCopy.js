// Conditions générales & mentions légales — GOLDEN PIRATES (FR / EN)
// Source unique : toute évolution du Site (données, durées, services tiers) doit être reportée ICI.
// Durées alignées sur backend/server.py (RETENTION_* + REAPPLY_COOLDOWN_DAYS).

export const CONDITIONS_VERSION = "2.2";

const fr = {
  updated: "VERSION 2.2 — EN VIGUEUR DEPUIS LE 20 OCTOBRE 2026",
  intro:
    "La confiance d'un équipage se gagne à voix haute. Ce parchemin dit tout, sans langue de bois : qui édite et héberge ce site, quelles informations nous recueillons, combien de temps nous les gardons, ce que deviennent les dons, et les règles du bord. Il est rédigé conformément au droit français et européen (LCEN, RGPD, loi Informatique et Libertés).",
  contactTitle: "UNE QUESTION, UN DOUTE, UNE RÉCLAMATION ?",
  sections: [
    {
      id: "editeur", toc: "L'éditeur du site",
      title: "1 · Mentions légales — l'éditeur",
      paras: ["Conformément à l'article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), le site https://golden-pirates.org (ci-après « le Site ») est édité par :"],
      card: [
        "Éditeur et directeur de la publication : M. Charly Soudan",
        "Statut : personne physique, à titre personnel et non professionnel",
        "Adresse : 36 avenue du parc — 93290 Tremblay-en-France, France",
        "Courriel dédié au Site : golden.pirates@outlook.fr",
        "Nature du Site : site communautaire de fans, gratuit, sans publicité ni activité commerciale",
      ],
    },
    {
      id: "hebergeur", toc: "L'hébergement",
      title: "2 · L'hébergeur",
      paras: ["Le Site, sa base de données et ses fichiers sont hébergés par :"],
      card: [
        "Emergent Labs Inc.",
        "255 California Street, Suite 550 — San Francisco, CA 94111, États-Unis",
        "Contact : support@emergent.sh — questions de données personnelles : privacy@emergent.sh",
        "Site : https://emergent.sh",
      ],
      paras2: [
        "L'hébergeur et ses prestataires d'infrastructure stockent les données dans des centres situés aux États-Unis, dans l'Union européenne ou en Inde. Les transferts hors de l'Union européenne sont encadrés par les clauses contractuelles types de la Commission européenne, prévues dans l'accord de traitement des données de l'hébergeur (articles 44 à 46 du RGPD).",
        "Le trafic du Site transite par le réseau de Cloudflare, Inc. (101 Townsend Street, San Francisco, CA 94107, États-Unis), utilisé par l'hébergeur pour acheminer les pages et protéger le Site contre les attaques. Cloudflare traite à cette fin l'adresse IP des visiteurs, sans publicité ni mesure d'audience.",
      ],
    },
    {
      id: "objet", toc: "Objet & acceptation",
      title: "3 · Objet & acceptation des conditions",
      paras: [
        "Les présentes Conditions générales d'utilisation (les « Conditions ») fixent les règles d'accès et d'usage du Site et de tous ses espaces : site public, Espace Recrue (suivi du dossier, Bouteille à la Mer, Tanière des Recrues, Étagère à bouteilles), page « Le Coffre du Navire » (dons) et Espace Conseil.",
        "Déposer une candidature, envoyer un message ou déclarer un don vaut acceptation des Conditions : une case à cocher sur le formulaire de candidature et une mention sur le parcours de don te le rappellent avant l'envoi. La simple consultation du Site n'exige aucune démarche. Si une ligne te pose question, écris-nous avant d'embarquer.",
      ],
    },
    {
      id: "description", toc: "Un site de fans, 100 % gratuit",
      title: "4 · Un site de fans — 100 % gratuit, non affilié au jeu",
      paras: [
        "Le Site est un site communautaire de fans du jeu Call of Dragons, consacré à l'alliance GOLDEN PIRATES du Royaume 1023. Il n'est ni édité, ni affilié, ni sponsorisé, ni approuvé par Farlight Games, éditeur du jeu.",
        "L'accès au Site et à toutes ses fonctions est entièrement gratuit : aucun compte payant, aucun abonnement, aucune vente, aucune publicité. Personne ne te demandera jamais d'argent pour postuler, être recruté, obtenir un rang ou rester à bord.",
      ],
    },
    {
      id: "espaces", toc: "Les espaces du site",
      title: "5 · Les espaces du Site",
      bullets: [
        "Le site public : la présentation de l'alliance, le Code des Pirates, le récit des saisons, le processus d'embarquement et le formulaire de candidature.",
        "L'Espace Recrue : le suivi de ton dossier avec ton code personnel GP-1023-XXXX, la Bouteille à la Mer (ta messagerie privée avec le Conseil), la Tanière des Recrues (échanges entre recrues) et l'Étagère à bouteilles (tes codes gardés sur ton appareil). Ton code de suivi est ta clé : garde-le pour toi.",
        "Le Coffre du Navire : les dons volontaires, ton carnet de dons, tes reçus et le Hall des donateurs.",
        "L'Espace Conseil : l'espace privé des administrateurs de l'alliance, protégé par identifiants et par un verrou anti-intrusion (5 essais, puis 15 minutes de blocage).",
      ],
    },
    {
      id: "recrutement", toc: "Recrutement & candidatures",
      title: "6 · Recrutement & candidatures",
      paras: [
        "Les informations du formulaire (pseudo, puissance, troupes, activité, message et, si tu le souhaites, un canal de contact : ton tag Discord ou un autre moyen de te joindre — Telegram, WhatsApp, pseudo en jeu) servent uniquement à l'examen de ta candidature par le Conseil des Capitaines. Aucun contact n'est obligatoire : sans Discord, le Conseil te répond dans la Bouteille à la Mer de ton Espace Recrue.",
        "Déposer une candidature ne donne aucun droit à l'admission. Chaque dossier est lu avec soin, mais la décision du Conseil reste souveraine ; un refus n'est pas toujours motivé et n'ouvre droit à aucune indemnité.",
        "Règles anti-abus : un seul dossier en examen à la fois par pseudo, au plus 6 candidatures par jour depuis un même appareil, et un délai de 30 jours après un refus avant de pouvoir postuler à nouveau. Ce délai s'applique au même pseudo, à ses variantes d'écriture (accents, majuscules, points, espaces) et au même tag Discord. Le Conseil peut lever ce délai à tout moment en réexaminant le dossier.",
        "Le recrutement suit les règles de migration du jeu (fin de Saison 2). Les dates affichées sont indicatives : seules les annonces officielles de l'éditeur du jeu font foi.",
      ],
    },
    {
      id: "dons", toc: "Les dons volontaires",
      title: "7 · Les dons volontaires (PayPal)",
      paras: [
        "Le Site accepte des dons volontaires par PayPal. Un don est un cadeau libre, sans aucune contrepartie : il n'ouvre aucun droit, avantage ni rang, et ne pèse jamais sur l'examen d'une candidature. Donateur ou non, ta place à bord est la même.",
        "Déroulement : tu choisis un montant, tu indiques ton pseudo (ou choisis l'anonymat), puis un bordereau GPD-1023-XXXX est créé avant que tu sois redirigé vers PayPal. Le paiement a lieu uniquement chez PayPal : le Site ne voit jamais tes coordonnées bancaires ni ton compte PayPal. Le Conseil confirme ensuite manuellement l'arrivée du don.",
        "Reçu de don non fiscal : le document PDF ou Excel délivré atteste d'un don. Ce n'est pas une facture et il n'ouvre droit à aucune réduction d'impôt, car le Site n'est pas un organisme d'intérêt général (articles 200 et 238 bis du Code général des impôts non applicables). Aucune TVA n'est due, aucun bien ni service n'étant fourni.",
        "Remboursement : sur simple demande écrite à golden.pirates@outlook.fr dans les 14 jours suivant le paiement, sans justification. Passé ce délai, le don est définitif. Les dons financent exclusivement le Site (hébergement, nom de domaine) et la vie de l'alliance.",
        "Le Hall des donateurs affiche ton pseudo, ou « Marin anonyme » si tu l'as demandé, avec le montant donné. Ton courriel et ton mot pour l'équipage ne sont jamais publiés.",
        "PayPal (Europe) S.à r.l. et Cie, S.C.A., 22-24 boulevard Royal, L-2449 Luxembourg, traite le paiement en tant que responsable de traitement distinct, selon sa propre politique de confidentialité.",
      ],
    },
    {
      id: "donnees", toc: "Données personnelles (RGPD)",
      title: "8 · Protection des données personnelles (RGPD)",
      paras: [
        "Responsable du traitement : M. Charly Soudan (coordonnées à l'article 1). Le Site ne recueille que le strict nécessaire. Voici, pour chaque traitement, les données concernées, leur but, leur base légale (article 6 du RGPD) et leur durée de conservation :",
      ],
      bullets: [
        "Candidature et suivi : pseudo, puissance, troupes, activité, message, canal de contact facultatif (tag Discord ou autre moyen de te joindre), expérience pour les dossiers déposés avant le 20 octobre 2026, statut et note du Conseil. But : examiner ta candidature et te répondre. Base : ton consentement, donné à l'envoi. Durée : 12 mois après la dernière décision, puis suppression automatique avec les messages liés.",
        "Messageries : messages de la Bouteille à la Mer et de la Tanière des Recrues. But : échanger avec le Conseil et entre recrues, modérer. Base : consentement et intérêt légitime (modération). Durée : celle du dossier auquel ils sont rattachés.",
        "Délai après refus : pseudo, son empreinte d'écriture et tag Discord. But : faire respecter le délai de 30 jours. Base : intérêt légitime (lutte contre les abus). Durée : 30 jours, puis suppression automatique.",
        "Dons : pseudo, montant, devise, numéro de bordereau, choix d'anonymat et, si tu les donnes, courriel et mot pour l'équipage. But : établir ton reçu, afficher le Hall, traiter un remboursement. Base : consentement et intérêt légitime (preuve du don). Durée : 3 ans, puis suppression automatique.",
        "Sécurité : adresse IP technique (limites anti-abus), journal des tentatives de connexion à l'Espace Conseil et des tentatives de récupération de code. But : protéger le Site. Base : intérêt légitime. Durée : 48 heures pour l'IP liée aux candidatures et aux dons, 2 heures pour les récupérations de code, 30 jours pour le journal de connexion.",
      ],
      paras2: [
        "Destinataires : uniquement le Conseil des Capitaines, ainsi que l'hébergeur en qualité de sous-traitant (article 2). Tes données ne sont jamais vendues, louées ni cédées, ni utilisées à des fins publicitaires. Aucune décision automatisée, aucun profilage, aucune intelligence artificielle n'est appliqué à tes données.",
        "Sécurité : connexion chiffrée (HTTPS), mots de passe du Conseil hachés (bcrypt), cookie de session protégé (httpOnly, secure), verrouillage anti-intrusion. En cas de violation de données présentant un risque, la CNIL est notifiée sous 72 heures et les personnes concernées sont informées (articles 33 et 34 du RGPD).",
        "Tes droits : accès, rectification, effacement, limitation, opposition, portabilité, retrait du consentement à tout moment, et directives sur le sort de tes données après ton décès (article 85 de la loi Informatique et Libertés). Écris à golden.pirates@outlook.fr en indiquant ton code de suivi ou ton bordereau : réponse sous un mois au plus (article 12 du RGPD).",
        "Réclamation : tu peux saisir la CNIL, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, www.cnil.fr.",
        "Mineurs : en France, un mineur peut consentir seul à partir de 15 ans (article 45 de la loi Informatique et Libertés). En dessous, la candidature ou le don exige l'accord d'un parent ou tuteur, qui peut demander la suppression du dossier à tout moment.",
      ],
    },
    {
      id: "cookies", toc: "Stockage local & cookies",
      title: "9 · Stockage local & cookies",
      paras: [
        "Le Site n'utilise aucun cookie publicitaire, aucune mesure d'audience et aucun traceur tiers. Ses polices et ses images sont hébergées sur le Site lui-même : aucune donnée de navigation n'est transmise à Google ni à une banque d'images. Seuls des éléments techniques, nécessaires au service que tu demandes, sont enregistrés sur ton appareil. Ils sont exemptés de consentement (article 82 de la loi Informatique et Libertés, lignes directrices de la CNIL) :",
      ],
      bullets: [
        "gp_lang : ta langue (français ou anglais) ;",
        "gp_terms_seen : la version des Conditions dont tu as pris connaissance, pour ne pas t'afficher deux fois le bandeau de mise à jour ;",
        "gp_bottles et gp_last_seen : tes codes de suivi gardés sur l'Étagère, et la date de ta dernière visite pour les notifications ;",
        "gp_apply_draft_v2 et gp_gift_draft : les brouillons de ta candidature et de ton don, sauvegardés en silence pour ne rien perdre si tu quittes la page ;",
        "gp_gifts : les bordereaux de tes dons, pour ton carnet de dons ;",
        "des indicateurs de session temporaires (sessionStorage), effacés à la fermeture de l'onglet ;",
        "access_token : le cookie de connexion de l'Espace Conseil (administrateurs uniquement, valable 12 heures).",
      ],
      paras2: [
        "Ces éléments restent sur ton appareil et tu peux les effacer à tout moment dans les réglages de ton navigateur. Tu perds seulement le confort (codes et brouillons mémorisés), jamais l'accès au Site. Discord et PayPal ne sont contactés que si tu cliques sur leurs liens ; leurs propres règles s'appliquent alors.",
      ],
    },
    {
      id: "propriete", toc: "Propriété intellectuelle",
      title: "10 · Propriété intellectuelle",
      paras: [
        "Les textes, le logo, la mise en page, le code et les illustrations originales du Site appartiennent à son éditeur. Toute reproduction ou réutilisation sans autorisation écrite est interdite (articles L.122-4 et L.335-2 du Code de la propriété intellectuelle).",
        "« Call of Dragons » et ses marques, logos et contenus appartiennent à Farlight Games ; le Site ne les revendique pas. Certaines illustrations sont des créations originales générées par intelligence artificielle pour le Site. Les photographies proviennent des banques libres de droits Pexels et Unsplash, sous leurs licences respectives. Les polices (Pirata One, Cinzel Decorative, IM Fell English, JetBrains Mono, Liberation) sont distribuées sous licence libre SIL Open Font License.",
      ],
    },
    {
      id: "conduite", toc: "Règles de conduite",
      title: "11 · Les règles de conduite à bord",
      paras: [
        "La Tanière et la Bouteille à la Mer sont des espaces de respect mutuel. Y sont interdits : insultes, harcèlement, propos haineux, discriminatoires, à caractère sexuel ou violents, spam et publicité, contenus illicites, triche, logiciels malveillants, usurpation d'identité, et toute collecte des données d'autres joueurs. N'y publie jamais de données sensibles, ni les tiennes ni celles d'autrui.",
      ],
    },
    {
      id: "moderation", toc: "Modération & signalement",
      title: "12 · Modération & signalement",
      paras: [
        "Le Conseil peut retirer tout message contraire aux Conditions, suspendre l'accès d'un joueur à la Tanière, et refuser ou clore une candidature en cas d'abus, sans préjudice d'éventuelles poursuites.",
        "Pour signaler un contenu que tu estimes illicite, écris à golden.pirates@outlook.fr en précisant : la date, l'endroit du Site, le contenu en cause, les raisons du signalement et tes coordonnées (article 6-I-5 de la LCEN et règlement européen sur les services numériques). Chaque signalement est lu, examiné et suivi d'une réponse.",
      ],
    },
    {
      id: "responsabilite", toc: "Responsabilité",
      title: "13 · Responsabilité",
      paras: [
        "Le Site est fourni « en l'état ». Des interruptions pour maintenance ou évolution peuvent survenir, sans garantie de disponibilité continue. L'éditeur ne répond ni des décisions et pertes dans le jeu, ni des litiges entre joueurs, ni du contenu des sites tiers. Tu es responsable de la confidentialité de ton code de suivi et de ton bordereau.",
      ],
    },
    {
      id: "liens", toc: "Liens & services tiers",
      title: "14 · Liens & services tiers",
      paras: [
        "Le Site renvoie vers des services tiers : Discord (serveur de l'alliance, proposé aux recrues acceptées), PayPal (dons) et les pages officielles du jeu. L'éditeur n'a aucun contrôle sur ces services ; leur usage relève de leurs propres conditions et politiques de confidentialité.",
      ],
    },
    {
      id: "modification", toc: "Modification des conditions",
      title: "15 · Modification des conditions",
      paras: [
        "Les Conditions peuvent évoluer avec le Site ou la loi. La version en vigueur est celle affichée sur cette page, avec son numéro et sa date. Une modification importante (nouvelles données, nouvelle durée de conservation, nouveau service tiers) est signalée sur le Site.",
      ],
    },
    {
      id: "droit", toc: "Droit applicable & litiges",
      title: "16 · Droit applicable & litiges",
      paras: [
        "Les Conditions sont soumises au droit français. En cas de désaccord, écris d'abord à golden.pirates@outlook.fr : un différend entre marins se règle d'abord à l'amiable. À défaut d'accord, le litige relève des tribunaux français compétents. Le Site ne vendant aucun bien ni service, le dispositif de médiation de la consommation ne s'applique pas.",
      ],
    },
    {
      id: "contact", toc: "Nous écrire",
      title: "17 · Nous écrire",
      paras: ["Pour toute question sur les Conditions, sur tes données, sur un don ou sur le Site :"],
      card: [
        "Charly Soudan — GOLDEN PIRATES, Royaume 1023",
        "36 avenue du parc — 93290 Tremblay-en-France, France",
        "golden.pirates@outlook.fr",
      ],
    },
  ],
};

const en = {
  updated: "VERSION 2.2 — IN EFFECT SINCE 20 OCTOBER 2026",
  intro:
    "A crew's trust is earned out loud. This scroll tells everything, in plain words: who runs and hosts this site, what information we collect, how long we keep it, what happens to donations, and the ship's rules. It is written in line with French and EU law (LCEN, GDPR, French Data Protection Act). The French version prevails in case of discrepancy.",
  contactTitle: "A QUESTION, A DOUBT, A COMPLAINT?",
  sections: [
    {
      id: "editeur", toc: "The site editor",
      title: "1 · Legal notice — the editor",
      paras: ["In accordance with Article 6-III of French law no. 2004-575 of 21 June 2004 (LCEN), the website https://golden-pirates.org (the “Site”) is published by:"],
      card: [
        "Editor and publication director: Mr Charly Soudan",
        "Status: private individual, acting personally and non-professionally",
        "Address: 36 avenue du parc — 93290 Tremblay-en-France, France",
        "Dedicated email: golden.pirates@outlook.fr",
        "Nature of the Site: free fan community site, no advertising, no commercial activity",
      ],
    },
    {
      id: "hebergeur", toc: "Hosting",
      title: "2 · The host",
      paras: ["The Site, its database and its files are hosted by:"],
      card: [
        "Emergent Labs Inc.",
        "255 California Street, Suite 550 — San Francisco, CA 94111, United States",
        "Contact: support@emergent.sh — personal data questions: privacy@emergent.sh",
        "Website: https://emergent.sh",
      ],
      paras2: [
        "The host and its infrastructure providers store data in data centres located in the United States, the European Union or India. Transfers outside the European Union are covered by the European Commission's Standard Contractual Clauses, included in the host's data processing agreement (GDPR Articles 44 to 46).",
        "The Site's traffic goes through the network of Cloudflare, Inc. (101 Townsend Street, San Francisco, CA 94107, United States), used by the host to deliver pages and protect the Site against attacks. For this purpose Cloudflare processes visitors' IP addresses, with no advertising or audience measurement.",
      ],
    },
    {
      id: "objet", toc: "Purpose & acceptance",
      title: "3 · Purpose & acceptance of the terms",
      paras: [
        "These Terms of Use (the “Terms”) set the rules for accessing and using the Site and all its areas: public site, Recruit Area (file tracking, Message in a Bottle, Recruits' Den, Bottle Rack), “The ship's treasure chest” page (donations) and Council Area.",
        "Submitting an application, sending a message or declaring a donation means you accept the Terms: a checkbox on the application form and a notice on the donation path remind you before you send. Simply browsing the Site requires nothing. If a line raises a question, write to us before boarding.",
      ],
    },
    {
      id: "description", toc: "A 100% free fan site",
      title: "4 · A fan site — 100% free, not affiliated with the game",
      paras: [
        "The Site is a fan community site for the game Call of Dragons, dedicated to the GOLDEN PIRATES alliance of Kingdom 1023. It is not published, affiliated, sponsored or endorsed by Farlight Games, the game's publisher.",
        "Access to the Site and all its features is entirely free: no paid account, no subscription, no sales, no advertising. Nobody will ever ask you for money to apply, be recruited, get a rank or stay on board.",
      ],
    },
    {
      id: "espaces", toc: "The site's areas",
      title: "5 · The Site's areas",
      bullets: [
        "The public site: the alliance presentation, the Pirate Code, the season saga, the boarding process and the application form.",
        "The Recruit Area: tracking your file with your personal GP-1023-XXXX code, the Message in a Bottle (your private messages with the Council), the Recruits' Den (exchanges between recruits) and the Bottle Rack (your codes kept on your device). Your tracking code is your key: keep it to yourself.",
        "The ship's treasure chest: voluntary donations, your gift logbook, your receipts and the Donors' Hall.",
        "The Council Area: the alliance administrators' private area, protected by credentials and an anti-intrusion lock (5 attempts, then a 15-minute block).",
      ],
    },
    {
      id: "recrutement", toc: "Recruitment & applications",
      title: "6 · Recruitment & applications",
      paras: [
        "The form information (pseudonym, power, troops, activity, message and, if you wish, a contact channel: your Discord tag or another way to reach you — Telegram, WhatsApp, in-game name) is used only for the Captains' Council to review your application. No contact is mandatory: without Discord, the Council answers you in the Bottle to the Sea of your Recruit Space.",
        "Applying gives no right to admission. Every file is read carefully, but the Council's decision is final; a refusal is not always explained and gives no right to compensation.",
        "Anti-abuse rules: only one file under review at a time per pseudonym, at most 6 applications per day from the same device, and a 30-day wait after a refusal before applying again. This wait applies to the same pseudonym, its spelling variants (accents, capitals, dots, spaces) and the same Discord tag. The Council can lift it at any time by reviewing the file again.",
        "Recruitment follows the game's migration rules (end of Season 2). Dates shown are indicative: only the game publisher's official announcements prevail.",
      ],
    },
    {
      id: "dons", toc: "Voluntary donations",
      title: "7 · Voluntary donations (PayPal)",
      paras: [
        "The Site accepts voluntary donations through PayPal. A donation is a free gift with nothing in return: it grants no right, perk or rank, and never weighs on an application. Donor or not, your place on board is the same.",
        "How it works: you choose an amount, enter your pseudonym (or choose to stay anonymous), then a GPD-1023-XXXX receipt number is created before you are sent to PayPal. Payment happens only at PayPal: the Site never sees your bank details or your PayPal account. The Council then confirms manually that the donation arrived.",
        "Non-tax donation receipt: the PDF or Excel document you get certifies a gift. It is not an invoice and gives no tax deduction, as the Site is not a public-interest organisation (Articles 200 and 238 bis of the French Tax Code do not apply). No VAT is due, since no goods or services are provided.",
        "Refunds: on simple written request to golden.pirates@outlook.fr within 14 days of payment, no reason needed. After that, the donation is final. Donations fund only the Site (hosting, domain name) and the alliance's life.",
        "The Donors' Hall shows your pseudonym, or “Anonymous sailor” if you asked for it, with the amount given. Your email and your message to the crew are never published.",
        "PayPal (Europe) S.à r.l. et Cie, S.C.A., 22-24 boulevard Royal, L-2449 Luxembourg, processes the payment as a separate data controller, under its own privacy policy.",
      ],
    },
    {
      id: "donnees", toc: "Personal data (GDPR)",
      title: "8 · Personal data protection (GDPR)",
      paras: [
        "Data controller: Mr Charly Soudan (details in Article 1). The Site collects only what is strictly needed. For each processing, here is the data, its purpose, its legal basis (GDPR Article 6) and how long it is kept:",
      ],
      bullets: [
        "Application and tracking: pseudonym, power, troops, activity, message, optional contact channel (Discord tag or another way to reach you), experience for files submitted before 20 October 2026, status and Council note. Purpose: review your application and answer you. Basis: your consent, given when you send. Retention: 12 months after the last decision, then automatic deletion along with linked messages.",
        "Messaging: Message in a Bottle and Recruits' Den messages. Purpose: talk with the Council and between recruits, moderation. Basis: consent and legitimate interest (moderation). Retention: same as the file they belong to.",
        "Post-refusal wait: pseudonym, its spelling fingerprint and Discord tag. Purpose: enforce the 30-day wait. Basis: legitimate interest (preventing abuse). Retention: 30 days, then automatic deletion.",
        "Donations: pseudonym, amount, currency, receipt number, anonymity choice and, if you give them, email and message to the crew. Purpose: issue your receipt, show the Hall, handle a refund. Basis: consent and legitimate interest (proof of the gift). Retention: 3 years, then automatic deletion.",
        "Security: technical IP address (anti-abuse limits), log of Council Area login attempts and of code recovery attempts. Purpose: protect the Site. Basis: legitimate interest. Retention: 48 hours for the IP linked to applications and donations, 2 hours for code recoveries, 30 days for the login log.",
      ],
      paras2: [
        "Recipients: only the Captains' Council, plus the host acting as processor (Article 2). Your data is never sold, rented or transferred, nor used for advertising. No automated decision, no profiling and no artificial intelligence is applied to your data.",
        "Security: encrypted connection (HTTPS), hashed Council passwords (bcrypt), protected session cookie (httpOnly, secure), anti-intrusion lock. If a data breach creates a risk, the CNIL is notified within 72 hours and the people concerned are informed (GDPR Articles 33 and 34).",
        "Your rights: access, rectification, erasure, restriction, objection, portability, withdrawal of consent at any time, and instructions on what happens to your data after your death (Article 85 of the French Data Protection Act). Write to golden.pirates@outlook.fr with your tracking code or receipt number: answer within one month at most (GDPR Article 12).",
        "Complaints: you can contact the CNIL (French data protection authority), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, www.cnil.fr, or your own country's supervisory authority.",
        "Minors: in France, a minor can consent alone from age 15 (Article 45 of the French Data Protection Act). Below that age, an application or donation requires the agreement of a parent or guardian, who can ask for the file to be deleted at any time.",
      ],
    },
    {
      id: "cookies", toc: "Local storage & cookies",
      title: "9 · Local storage & cookies",
      paras: [
        "The Site uses no advertising cookie, no audience measurement and no third-party tracker. Its fonts and images are hosted on the Site itself: no browsing data is sent to Google or to any image bank. Only technical items needed for the service you ask for are stored on your device. They are exempt from consent (Article 82 of the French Data Protection Act, CNIL guidelines):",
      ],
      bullets: [
        "gp_lang: your language (French or English);",
        "gp_terms_seen: the version of the Terms you have acknowledged, so the update banner is not shown twice;",
        "gp_bottles and gp_last_seen: your tracking codes kept on the Rack, and the date of your last visit for notifications;",
        "gp_apply_draft_v2 and gp_gift_draft: drafts of your application and donation, silently saved so nothing is lost if you leave the page;",
        "gp_gifts: your donation receipt numbers, for your gift logbook;",
        "temporary session flags (sessionStorage), cleared when you close the tab;",
        "access_token: the Council Area login cookie (administrators only, valid 12 hours).",
      ],
      paras2: [
        "These items stay on your device and you can erase them at any time in your browser settings. You only lose convenience (saved codes and drafts), never access to the Site. Discord and PayPal are contacted only if you click their links; their own rules then apply.",
      ],
    },
    {
      id: "propriete", toc: "Intellectual property",
      title: "10 · Intellectual property",
      paras: [
        "The Site's texts, logo, layout, code and original illustrations belong to its editor. Any reproduction or reuse without written permission is prohibited (Articles L.122-4 and L.335-2 of the French Intellectual Property Code).",
        "“Call of Dragons” and its trademarks, logos and content belong to Farlight Games; the Site claims none of them. Some illustrations are original AI-generated creations made for the Site. Photographs come from the royalty-free libraries Pexels and Unsplash, under their respective licences. The fonts (Pirata One, Cinzel Decorative, IM Fell English, JetBrains Mono, Liberation) are distributed under the free SIL Open Font License.",
      ],
    },
    {
      id: "conduite", toc: "Code of conduct",
      title: "11 · The code of conduct on board",
      paras: [
        "The Den and the Message in a Bottle are spaces of mutual respect. Forbidden: insults, harassment, hateful, discriminatory, sexual or violent content, spam and advertising, illegal content, cheating, malware, identity theft, and any collection of other players' data. Never post sensitive data there, yours or anyone else's.",
      ],
    },
    {
      id: "moderation", toc: "Moderation & reporting",
      title: "12 · Moderation & reporting",
      paras: [
        "The Council may remove any message that breaks the Terms, suspend a player's access to the Den, and refuse or close an application in case of abuse, without prejudice to any legal action.",
        "To report content you believe is illegal, write to golden.pirates@outlook.fr stating: the date, where on the Site, the content concerned, why you report it and your contact details (LCEN Article 6-I-5 and the EU Digital Services Act). Every report is read, reviewed and answered.",
      ],
    },
    {
      id: "responsabilite", toc: "Liability",
      title: "13 · Liability",
      paras: [
        "The Site is provided “as is”. Interruptions for maintenance or updates may happen, with no guarantee of continuous availability. The editor is not liable for in-game decisions and losses, disputes between players, or the content of third-party sites. You are responsible for keeping your tracking code and receipt number private.",
      ],
    },
    {
      id: "liens", toc: "Links & third-party services",
      title: "14 · Links & third-party services",
      paras: [
        "The Site links to third-party services: Discord (the alliance server, offered to accepted recruits), PayPal (donations) and the game's official pages. The editor has no control over these services; using them is governed by their own terms and privacy policies.",
      ],
    },
    {
      id: "modification", toc: "Changes to the terms",
      title: "15 · Changes to the terms",
      paras: [
        "The Terms may change along with the Site or the law. The version in force is the one shown on this page, with its number and date. Any significant change (new data, new retention period, new third-party service) is announced on the Site.",
      ],
    },
    {
      id: "droit", toc: "Governing law & disputes",
      title: "16 · Governing law & disputes",
      paras: [
        "The Terms are governed by French law. If you disagree, write first to golden.pirates@outlook.fr: a dispute between sailors is first settled amicably. Failing agreement, the dispute falls under the competent French courts. As the Site sells no goods or services, consumer mediation does not apply.",
      ],
    },
    {
      id: "contact", toc: "Write to us",
      title: "17 · Write to us",
      paras: ["For any question about the Terms, your data, a donation or the Site:"],
      card: [
        "Charly Soudan — GOLDEN PIRATES, Kingdom 1023",
        "36 avenue du parc — 93290 Tremblay-en-France, France",
        "golden.pirates@outlook.fr",
      ],
    },
  ],
};

export const CONDITIONS_COPY = { fr, en };
