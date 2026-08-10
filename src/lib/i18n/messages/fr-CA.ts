/**
 * French (Canada) message catalogue.
 *
 * Typed against `Messages`, so a key added in English and forgotten here fails
 * the build (FR-I18N-001).
 *
 * PRD FR-I18N-002 and the launch gate both require this copy to be reviewed by
 * a fluent Canadian French speaker before public launch. It is written for
 * Canadian readers — «magasinage» rather than «shopping», «courriel» rather
 * than «email», «clavardage» for chat — and avoids the literal-translation
 * failures the product itself exists to detect. Until that human review is
 * recorded, the launch gate in RELEASE_CHECKLIST.md stays unchecked.
 */

import type { Messages } from './en-CA';

export const frCA: Messages = {
  common: {
    brandName: 'BotAssure CX',
    skipToContent: 'Passer au contenu principal',
    languageSwitcherLabel: 'Langue',
    loading: 'Chargement',
    errorTitle: 'Une erreur est survenue',
    errorBody:
      "La page n'a pas pu être chargée. Veuillez réessayer ou communiquer avec le soutien si le problème persiste.",
    notFoundTitle: 'Page introuvable',
    notFoundBody: "La page demandée n'existe pas ou a été déplacée.",
    backToHome: "Retour à l'accueil",
  },

  nav: {
    home: 'Accueil',
    howItWorks: 'Comment ça fonctionne',
    methodology: 'Méthodologie',
    pricing: 'Tarifs',
    sampleReport: 'Exemple de rapport',
    security: 'Sécurité et confidentialité',
    about: 'À propos',
    contact: 'Nous joindre',
    faq: 'Foire aux questions',
    signIn: 'Se connecter',
    startAudit: 'Commencer un audit',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
  },

  home: {
    metaTitle:
      "Assurance qualité bilingue de l'expérience client par IA pour les entreprises canadiennes",
    metaDescription:
      "BotAssure CX met à l'épreuve votre IA en contact avec la clientèle, en anglais et en français canadien, avec des preuves documentées et une révision humaine obligatoire, pour que vous trouviez les défaillances avant vos clients.",
    category: "Test et assurance qualité bilingues de l'expérience client par IA",
    headline: 'Trouvez les défaillances avant vos clients',
    subhead:
      "Nous soumettons votre IA en contact avec la clientèle à de véritables scénarios de service, en anglais et en français canadien, nous documentons ce qui s'est réellement passé et nous vous remettons une liste de correctifs classés par priorité.",
    primaryCta: 'Commencer un audit',
    secondaryCta: 'Voir un exemple de rapport',

    whatWeTestTitle: 'Ce que nous évaluons',
    whatWeTestIntro:
      "Chaque audit s'appuie sur vos propres politiques. Nous vérifions si le système dit la vérité à vos clients, règle leur problème et sait quand faire intervenir une personne.",
    whatWeTest: [
      {
        title: 'Exactitude des faits et des politiques',
        body: "La réponse correspond-elle à votre politique officielle, ou le système a-t-il inventé une règle qui n'existe pas?",
      },
      {
        title: 'Résolution et exécution de la demande',
        body: "La conversation mène-t-elle le client vers une solution juste et concrète, ou se contente-t-elle d'avoir l'air utile?",
      },
      {
        title: 'Sécurité et confidentialité',
        body: "Le système évite-t-il les conseils dangereux, la collecte inutile de renseignements et les divulgations qu'il ne devrait jamais faire?",
      },
      {
        title: 'Transfert à une personne',
        body: 'Reconnaît-il ses limites et oriente-t-il le client vers le bon canal humain?',
      },
      {
        title: 'Contexte et mémoire de la conversation',
        body: 'Retient-il ce que le client a déjà dit, ou se contredit-il trois échanges plus loin?',
      },
      {
        title: 'Empathie et ton de la marque',
        body: 'Est-il respectueux et clair lorsque le client est frustré, désorienté ou pressé?',
      },
      {
        title: 'Qualité de la langue et adaptation culturelle',
        body: "Le français canadien est-il naturel et équivalent à l'anglais, ou s'agit-il d'une traduction littérale qui en perd le sens?",
      },
    ],

    processTitle: 'Trois étapes',
    process: [
      {
        step: '1',
        title: 'Définir la portée et autoriser',
        body: "Vous nous indiquez le système à évaluer et les politiques qui font autorité, puis vous confirmez par écrit que vous êtes en mesure d'autoriser le test.",
      },
      {
        step: '2',
        title: 'Tester et réviser',
        body: 'Nous exécutons les scénarios, conservons chaque réponse à titre de preuve, et un analyste révise chaque résultat avant que quoi que ce soit ne se retrouve dans votre rapport.',
      },
      {
        step: '3',
        title: 'Corriger et retester',
        body: 'Vous recevez des constats appuyés par des preuves et classés par gravité, avec des correctifs précis. Une fois les correctifs appliqués, nous retestons.',
      },
    ],

    bilingualTitle: 'Anglais et français, évalués séparément',
    bilingualBody:
      "La plupart des tests traitent le français comme un simple problème de traduction. Nous exécutons des paires de scénarios équivalents dans les deux langues et nous les comparons directement, parce qu'un client francophone qui reçoit une réponse différente subit une défaillance de service, et non un détail de localisation.",

    humanReviewTitle: 'Chaque constat est révisé par une personne',
    humanReviewBody:
      "Les vérifications automatisées et l'assistance de l'IA réduisent le champ d'analyse. Elles ne tranchent pas. Un analyste révise chaque dimension évaluée et statue sur chaque constat critique ou élevé avant la publication du rapport. Rien ne vous parvient sur la seule foi d'un modèle.",

    limitationsTitle: "Ce que c'est, et ce que ce n'est pas",
    limitationsBody:
      "Un rapport BotAssure CX est une évaluation de l'expérience client et des risques portant sur un échantillon défini, à un moment précis. Ce n'est pas un avis juridique, une certification de sécurité, un test d'intrusion ni une attestation de conformité réglementaire. Les systèmes d'IA sont probabilistes et peuvent répondre différemment à une même question; un audit ne peut pas prouver l'absence de défauts non découverts.",

    finalCtaTitle: 'Prêt à voir ce que vos clients se font réellement répondre?',
    finalCtaBody:
      "Commencez par un seul système et une langue, ou optez d'emblée pour le bilingue.",
  },

  pricing: {
    metaTitle: 'Tarifs',
    metaDescription:
      "Audits ponctuels bilingues de l'expérience client par IA et abonnements de surveillance continue, en dollars canadiens.",
    title: 'Tarifs',
    intro:
      'Les prix sont en dollars canadiens et affichés avant taxes. Les taxes applicables sont calculées au moment du paiement.',
    perMonth: 'par mois',
    oneTime: 'paiement unique',
    customQuote: 'Sur devis',
    choosePlan: 'Choisir cette formule',
    contactSales: 'Nous parler',
    mostPopular: 'Le plus populaire',
    includedLabel: 'Comprend',
    taxNote:
      'Plus les taxes applicables. Les délais cibles commencent une fois le démarrage terminé.',
    turnaroundNote:
      "Nous parlons de délai cible plutôt que de garantie. Le compte à rebours démarre après le paiement et l'acceptation du dossier de démarrage, et s'arrête pendant que nous attendons une réponse de votre part.",
  },

  methodology: {
    metaTitle: 'Méthodologie',
    metaDescription:
      "Comment BotAssure CX évalue l'IA en contact avec la clientèle : sept dimensions pondérées, vérifications déterministes, analyse assistée par IA et révision humaine obligatoire.",
    title: 'Notre méthode de notation',
    intro:
      "La méthode se veut compréhensible, reproductible et honnête quant à l'incertitude. Chaque chiffre d'un rapport renvoie à une réponse précise et à une politique précise.",
    dimensionsTitle: 'Sept dimensions',
    dimensionsIntro:
      "Chaque dimension applicable est notée de 0 à 5, puis pondérée. Une dimension qui ne s'applique pas à un scénario est exclue du dénominateur de ce scénario, et le motif est consigné.",
    dimensionHeader: 'Dimension',
    weightHeader: 'Pondération',
    questionHeader: 'Question de fond',
    gradesTitle: 'Cotes',
    gradesIntro:
      "Les cotes ne décrivent que la portée testée et le moment du test. Ce ne sont pas des certifications et elles ne s'étendent pas aux parties non testées de votre système.",
    capsTitle: 'Plafonds liés à la gravité',
    capsBody:
      "Une moyenne peut masquer un préjudice grave; nous ne le permettons pas. Un constat critique confirmé plafonne la note globale à 49 et la cote à F. Un constat élevé non résolu touchant l'exactitude des faits, la sécurité et la confidentialité, ou un transfert obligatoire, plafonne la note à 69 et la cote à D. Lorsqu'un plafond s'applique, le rapport l'indique et en donne la raison.",
    parityTitle: 'Parité entre les langues',
    parityBody:
      "Les cas anglais et français équivalents sont comparés directement. L'indice de parité correspond à 100 moins l'écart moyen pondéré entre les deux notes. Sous le seuil de dix paires valides, nous ne publions aucun chiffre : vous recevez plutôt une évaluation rédigée, car un indice calculé à partir de trois paires laisserait croire à une précision que nous n'avons pas.",
    limitationsTitle: 'Limites déclarées',
    limitations: [
      'Les résultats reflètent un échantillon, une configuration et un moment définis.',
      'Les systèmes probabilistes peuvent répondre différemment à une même question.',
      "L'audit ne prouve pas l'absence de défauts non découverts.",
      'Les constats dépendent de  l’exactitude des politiques que vous fournissez.',
      "L'audit ne constitue ni un avis juridique, ni un test d'intrusion, ni une certification réglementaire.",
      'Les modifications apportées à la production après les tests peuvent invalider les résultats.',
    ],
  },

  security: {
    metaTitle: 'Pratiques de sécurité et de confidentialité',
    metaDescription:
      "Comment BotAssure CX gère l'autorisation, les données de test synthétiques, le cloisonnement des clients, la conservation et la réponse aux incidents.",
    title: 'Pratiques de sécurité et de confidentialité',
    intro:
      "Cette page décrit ce que nous faisons réellement. Il ne s'agit pas d'une certification et nous n'en revendiquons aucune.",
    sections: [
      {
        title: 'Nous testons uniquement ce que vous autorisez',
        body: "Avant tout test, vous confirmez par écrit que vous êtes propriétaire du système ou que vous avez l'autorité pour commander le test, et vous en définissez la portée. Les tests cessent si l'autorisation expire ou est révoquée, si la cible sort de la portée convenue, ou si votre système montre des signes de surcharge.",
      },
      {
        title: 'Données synthétiques par défaut',
        body: "Les identités, adresses, numéros de commande et identifiants de compte utilisés pour les tests sont synthétiques et signalés comme tels. Nous ne demandons pas de dossiers clients réels pour réaliser un audit, et nous bloquons les formats connus de cartes de paiement et d'identifiants gouvernementaux réels, sauf exception approuvée.",
      },
      {
        title: 'Vos données sont séparées de celles de tous les autres clients',
        body: "Chaque organisation constitue un locataire distinct, cloisonné dans la base de données par la sécurité au niveau des lignes autant que dans l'application. L'accès entre locataires est couvert par une suite de tests automatisés exécutée avant chaque mise en production.",
      },
      {
        title: 'Vos transcriptions ne servent pas à entraîner des modèles',
        body: "Les transcriptions brutes ne sont jamais réutilisées pour entraîner des modèles sans une permission distincte, explicite et consignée. Les paramètres des fournisseurs sont configurés pour que le contenu transmis par API ne serve pas à l'entraînement général des modèles, lorsque cette option existe.",
      },
      {
        title: 'La conservation a une durée par défaut et une fin',
        body: "Les transcriptions brutes et les captures d'écran sont supprimées 90 jours après la publication du rapport, par défaut. Les rapports publiés et les constats sont conservés pendant la durée du service actif plus 24 mois, afin que vous puissiez les exporter. Vous pouvez demander une suppression anticipée dans la mesure où le contrat et la loi le permettent.",
      },
      {
        title: 'Incidents',
        body: "Nous tenons un registre des atteintes, même pour les incidents sous les seuils de déclaration, et nous n'automatisons aucune décision de notification légale. Si un incident touche vos données, une personne vous en informe.",
      },
    ],
  },

  legal: {
    reviewPendingTitle: 'Ce document fait l’objet d’une révision juridique',
    reviewPendingBody:
      "Il s'agit d'une version de travail qui n'a pas encore été approuvée par un conseiller juridique canadien. Elle ne constitue pas un avis juridique et ne doit pas être considérée comme une entente définitive. Elle est publiée ici afin que les conditions soient visibles pendant la révision.",
    termsTitle: "Conditions d'utilisation",
    privacyTitle: 'Politique de confidentialité',
    acceptableUseTitle: "Politique d'utilisation acceptable et de test autorisé",
    refundsTitle: 'Politique de remboursement et d’annulation',
    cookiesTitle: 'Choix relatifs aux témoins',
    lastUpdated: 'Dernière mise à jour',
  },

  footer: {
    tagline: "Assurance qualité bilingue de l'expérience client par IA.",
    workingNameNotice:
      'BotAssure CX est un nom de travail, sous réserve des vérifications de marque de commerce, de nom de domaine et de dénomination sociale.',
    legalHeading: 'Mentions légales',
    productHeading: 'Produit',
    companyHeading: 'Entreprise',
    terms: 'Conditions',
    privacy: 'Confidentialité',
    acceptableUse: 'Utilisation acceptable',
    refunds: 'Remboursements',
    cookies: 'Témoins',
    status: 'État des services',
    support: 'Soutien',
    allRightsReserved: 'Tous droits réservés.',
  },
};
