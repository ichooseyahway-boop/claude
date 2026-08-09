import type { Messages } from './en-CA';

/**
 * Français (Canada) — catalogue de messages.
 *
 * PRD refs: FR-I18N-001, FR-I18N-002.
 *
 * Typed as `Messages`, so any key missing from this file fails the type check.
 *
 * TRANSLATION STATUS: written for Canadian readers, not machine-translated.
 * Section 4.4 and FR-I18N-002 still require review by a fluent human reviewer
 * before public launch; that review is tracked in RELEASE_CHECKLIST.md and is a
 * launch gate. Terminology follows docs/GLOSSARY_FR.md.
 */
export const frCA: Messages = {
  meta: {
    localeName: 'Français',
    localeNameOther: 'English',
    switchLanguage: 'Passer à l’anglais',
    defaultDescription:
      'Tests et assurance bilingues pour l’IA en contact avec la clientèle. Scénarios structurés, preuves documentées et rapports révisés par une personne, en anglais et en français canadien.',
  },

  nav: {
    home: 'Accueil',
    howItWorks: 'Comment ça marche',
    methodology: 'Méthodologie',
    pricing: 'Tarifs',
    sampleReport: 'Exemple de rapport',
    security: 'Sécurité et vie privée',
    about: 'À propos',
    contact: 'Contact',
    faq: 'FAQ',
    signIn: 'Se connecter',
    startAudit: 'Démarrer un audit',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    skipToContent: 'Passer au contenu principal',
    mainNavigation: 'Navigation principale',
    footerNavigation: 'Navigation du pied de page',
  },

  common: {
    learnMore: 'En savoir plus',
    viewSampleReport: 'Voir un exemple de rapport',
    startAudit: 'Démarrer un audit',
    bookCall: 'Réserver un appel exploratoire',
    contactUs: 'Nous joindre',
    seePricing: 'Voir les tarifs',
    required: 'Obligatoire',
    optional: 'Facultatif',
    submit: 'Envoyer',
    sending: 'Envoi en cours…',
    backToTop: 'Retour en haut',
    lastUpdated: 'Dernière mise à jour',
    onThisPage: 'Sur cette page',
    perMonth: 'par mois',
    oneTime: 'paiement unique',
    plusTax: 'plus les taxes applicables',
    customQuote: 'Devis personnalisé',
    startingAt: 'À partir de',
  },

  footer: {
    tagline:
      'Assurance bilingue de l’expérience client pour les entreprises canadiennes qui utilisent l’IA.',
    product: 'Produit',
    company: 'Entreprise',
    legal: 'Documents juridiques',
    terms: 'Conditions d’utilisation',
    privacy: 'Politique de confidentialité',
    acceptableUse: 'Utilisation acceptable et tests autorisés',
    refunds: 'Politique de remboursement',
    cookies: 'Choix relatifs aux témoins',
    status: 'État du service',
    support: 'Assistance',
    rights: 'Tous droits réservés.',
    workingNameNotice:
      '{brand} est un nom de travail. Les vérifications de marque de commerce, de dénomination sociale et de nom de domaine sont en cours.',
    notCertification:
      'Un rapport {brand} est une évaluation de l’expérience client et des risques. Il ne constitue ni un avis juridique, ni une certification de sécurité, ni une attestation de conformité réglementaire.',
  },

  home: {
    metaTitle: 'Assurance bilingue de l’expérience client par IA',
    eyebrow: 'Tests et assurance bilingues de l’expérience client par IA',
    headline: 'Trouvez les défaillances avant vos clients.',
    subhead:
      'Votre IA en contact avec la clientèle répond chaque jour à des milliers de questions que vous ne voyez jamais. Nous la testons avec de vrais scénarios de service en anglais et en français canadien, nous documentons ce qui s’est réellement produit, et nous vous remettons un rapport appuyé sur des preuves et révisé par une personne.',
    primaryCta: 'Démarrer un audit',
    secondaryCta: 'Voir un exemple de rapport',
    trustLine:
      'Révision humaine. Preuves à l’appui. Tests effectués uniquement avec votre autorisation écrite.',

    whatWeTestTitle: 'Ce que nous testons',
    whatWeTestIntro:
      'Chaque audit exécute des scénarios structurés sur le système que vous autorisez, puis évalue chaque réponse selon sept dimensions.',
    whatWeTest: [
      {
        title: 'Exactitude des faits et des politiques',
        body: 'La réponse correspond-elle à vos politiques officielles, ou le système a-t-il inventé une règle qui n’existe pas?',
      },
      {
        title: 'Efficacité de la résolution',
        body: 'La conversation mène-t-elle le client vers une solution juste et concrète, plutôt que vers une boucle sans issue?',
      },
      {
        title: 'Sécurité et confidentialité',
        body: 'Évite-t-elle les conseils dangereux, la collecte inutile de renseignements et la divulgation d’information qu’elle ne devrait pas communiquer?',
      },
      {
        title: 'Escalade et transfert à une personne',
        body: 'Reconnaît-elle ses limites et dirige-t-elle le client vers le bon canal humain?',
      },
      {
        title: 'Contexte et mémoire',
        body: 'Retient-elle les faits pertinents d’un tour à l’autre sans se contredire?',
      },
      {
        title: 'Empathie et ton de la marque',
        body: 'Est-elle respectueuse, claire et adaptée à l’état émotionnel du client?',
      },
      {
        title: 'Qualité linguistique et adaptation culturelle',
        body: 'Le français est-il naturel pour un lectorat canadien, et équivalent sur le fond à la réponse anglaise?',
      },
    ],

    processTitle: 'Trois étapes',
    process: [
      {
        step: '1',
        title: 'Autoriser et délimiter',
        body: 'Vous confirmez que vous êtes propriétaire du système ou autorisé à le faire tester, vous indiquez quelles politiques font autorité, et vous choisissez l’anglais, le français ou les deux.',
      },
      {
        step: '2',
        title: 'Nous testons et documentons',
        body: 'Un analyste exécute l’ensemble de scénarios approuvé, capte chaque réponse avec horodatage et somme de contrôle, puis révise chaque résultat. L’IA assiste l’évaluation; elle n’a jamais le dernier mot.',
      },
      {
        step: '3',
        title: 'Vous recevez un rapport appuyé sur des preuves',
        body: 'Une note avec ventilation par dimension, des constats classés par gravité, chaque affirmation liée à la réponse qui l’appuie, et des correctifs réellement applicables.',
      },
    ],

    bilingualTitle: 'Anglais et français, testés séparément',
    bilingualBody:
      'La plupart des démarches de qualité en IA traitent le français comme un problème de traduction. Nous le traitons comme une question d’égalité de service. Des paires de scénarios appariées sont exécutées dans les deux langues et comparées sur le résultat, l’exactitude des politiques, l’escalade et le ton — pour qu’un client francophone ne reçoive pas discrètement une moins bonne réponse.',
    bilingualPoints: [
      'Paires de scénarios anglais/français appariées, exécutées et évaluées séparément.',
      'Un indice de parité qui montre où les deux langues divergent.',
      'Français canadien révisé par une personne qui le maîtrise, et non traduit automatiquement puis publié.',
    ],

    humanReviewTitle: 'La révision humaine n’est pas facultative',
    humanReviewBody:
      'L’évaluation automatisée est rapide et se trompe avec assurance assez souvent pour que cela compte. Chaque note de dimension et chaque constat de votre rapport ont été révisés et approuvés par un analyste. Les notes proposées par l’IA ne vous sont jamais présentées telles quelles, et aucun rapport n’est publié sans réviseur nommé ni horodatage.',

    packagesTitle: 'Forfaits',
    packagesIntro:
      'Les prix sont en dollars canadiens et excluent les taxes applicables.',

    limitationsTitle: 'Ce qu’un audit est et n’est pas',
    limitationsIntro:
      'Nous préférons vous le dire avant l’achat plutôt que dans une note de bas de page après coup.',
    limitations: [
      'Les résultats reflètent un échantillon défini de scénarios, une configuration et un moment précis.',
      'Les systèmes d’IA sont probabilistes. La même question peut donner une autre réponse demain.',
      'Un audit repère des défaillances. Il ne peut pas prouver qu’il n’en reste aucune.',
      'Les constats dépendent de l’exactitude des politiques que vous nous désignez comme faisant autorité.',
      'Il ne s’agit ni d’un avis juridique, ni d’un test d’intrusion, ni d’une certification réglementaire.',
      'Les changements apportés en production après les tests peuvent invalider les résultats.',
    ],

    faqTitle: 'Questions fréquentes',
    finalCtaTitle:
      'Prêt à découvrir ce que votre IA dit réellement à vos clients?',
    finalCtaBody:
      'Commencez par un audit Essentiel dans une seule langue, ou réservez un appel de 20 minutes pour délimiter un mandat bilingue.',
  },

  howItWorks: {
    metaTitle: 'Comment ça marche',
    title: 'Le déroulement d’un audit',
    intro:
      'De l’achat à la publication du rapport, chaque étape est conçue pour que vous sachiez toujours ce qui attend une action de votre part, et pour que rien ne soit testé sans votre autorisation.',
    stepsTitle: 'Le mandat, étape par étape',
    steps: [
      {
        title: 'Achat',
        body: 'Vous achetez un audit Essentiel ou Pro bilingue par paiement hébergé, ou nous émettons un devis pour un mandat sur mesure. Les données de carte vont directement à notre fournisseur de paiement — elles ne transitent jamais par nos systèmes.',
      },
      {
        title: 'Activation du compte',
        body: 'Vous recevez un lien de connexion et l’espace de travail de votre organisation est créé. Tout ce qui concerne votre mandat s’y trouve.',
      },
      {
        title: 'Liste de vérification d’intégration',
        body: 'Vous identifiez le système, son responsable, les langues visées et les politiques qui définissent une bonne réponse. Votre progression est enregistrée au fur et à mesure.',
      },
      {
        title: 'Autorisation écrite',
        body: 'Avant tout test, une personne autorisée de votre organisation atteste que vous êtes propriétaire du système ciblé ou autorisé à le faire tester, et confirme la portée, les points d’accès et les limites.',
      },
      {
        title: 'Revue de la portée',
        body: 'Un analyste examine la portée et l’accepte, demande des précisions, ou refuse un mandat qui dépasse ce que nous pouvons faire de façon sûre et compétente. Vous recevez toujours une explication claire.',
      },
      {
        title: 'Plan d’audit',
        body: 'L’analyste assemble un ensemble de scénarios tirés de notre bibliothèque et propres à vos politiques, apparie les cas bilingues, puis fige le plan sous forme de version avant l’exécution.',
      },
      {
        title: 'Exécution et captation',
        body: 'Les scénarios sont exécutés selon la méthode de captation que vous avez approuvée. Chaque question, chaque réponse, l’horodatage, la latence et une somme de contrôle sont consignés.',
      },
      {
        title: 'Évaluation et révision humaine',
        body: 'Les vérifications déterministes s’exécutent d’abord, puis l’évaluation assistée par IA, puis la révision obligatoire par l’analyste de chaque dimension et de chaque candidat critique ou élevé.',
      },
      {
        title: 'Publication du rapport',
        body: 'Un réviseur principal applique la liste de contrôle de publication — les preuves s’ouvrent, aucune note interne, aucun secret, plafonds appliqués — puis publie le rapport dans votre portail.',
      },
      {
        title: 'Correctifs et nouveau test',
        body: 'Vous attribuez les constats à l’interne, documentez les correctifs et les marquez prêts pour un nouveau test. Les cas retestés produisent de nouvelles preuves; les preuves d’origine ne sont jamais écrasées.',
      },
    ],
    captureTitle: 'Comment nous captons les réponses',
    captureIntro:
      'Vous choisissez la méthode de captation pendant l’intégration. Nous prenons en charge celles qui fonctionnent avec de vrais systèmes, y compris ceux qui n’exposent aucune API.',
    captureModes: [
      {
        title: 'Captation manuelle encadrée',
        body: 'Un analyste mène la conversation exactement comme le ferait un client et consigne chaque réponse avec sa preuve. Fonctionne avec tout canal, même sans API.',
      },
      {
        title: 'Transcriptions fournies par le client',
        body: 'Vous exportez les conversations à l’aide de notre gabarit validé. Utile lorsque votre équipe est la mieux placée pour exécuter les scénarios.',
      },
      {
        title: 'Captation par API autorisée',
        body: 'Avec votre autorisation écrite, nous appelons un point d’accès configuré côté serveur, sous des listes d’hôtes autorisés, des délais et des limites de débit stricts.',
      },
    ],
    browserRunnerNote:
      'L’exécution autonome par navigateur n’est pas activée. Elle demeure un module optionnel post-lancement et reste désactivée tant que ses contrôles d’isolement et d’autorisation n’ont pas passé une revue dédiée.',
    timelineTitle: 'Délai de réalisation',
    timelineBody:
      'La cible de cinq jours ouvrables pour les audits Essentiel et Pro bilingue commence après le paiement et une fois l’intégration complétée et acceptée — pas avant. Si nous attendons quelque chose de votre part, le compteur est suspendu et votre portail l’indique.',
    whatYouNeedTitle: 'Ce qu’il vous faut avant de commencer',
    whatYouNeed: [
      'Une personne qui peut autoriser les tests du système.',
      'Les politiques, FAQ ou contenus d’aide qui définissent une bonne réponse.',
      'Les chemins d’escalade qui devraient être offerts au client.',
      'Les accès à l’environnement à tester — idéalement un environnement de préproduction, avec des identifiants temporaires.',
      'Les sujets ou données qui doivent être exclus de la portée.',
    ],
  },

  methodology: {
    metaTitle: 'Méthodologie',
    title: 'Méthodologie d’audit',
    intro:
      'La méthodologie est publiée parce que vous devez pouvoir contester une note. Chaque rapport indique quelle version de la grille et de l’évaluateur l’a produite.',
    principlesTitle: 'Principes',
    principles: [
      'La preuve avant les hypothèses : chaque constat renvoie à la réponse qui l’appuie.',
      'Vos politiques font autorité : nous n’inventons pas une règle que vous n’avez jamais écrite.',
      'L’incertitude est déclarée, pas dissimulée : les résultats à faible confiance sont étiquetés et ne peuvent être portés au niveau critique sans confirmation humaine principale.',
      'Versionné et reproductible : les versions de la grille, des scénarios et de l’évaluateur sont consignées avec chaque résultat.',
      'Le jugement humain tranche : l’IA propose, l’analyste approuve.',
    ],
    dimensionsTitle: 'Dimensions d’évaluation',
    dimensionsIntro:
      'Les pondérations par défaut totalisent 100. Un gabarit sectoriel peut utiliser d’autres pondérations, et le rapport les divulgue alors.',
    dimensionHeader: 'Dimension',
    weightHeader: 'Pondération',
    questionHeader: 'Question centrale',
    scaleTitle: 'L’échelle de 0 à 5',
    scale: [
      {
        level: '5 — Excellent',
        body: 'Juste, complet, sûr et bien exécuté, sans défaut significatif.',
      },
      {
        level: '4 — Bon',
        body: 'Juste et utile, avec une possibilité mineure d’amélioration.',
      },
      {
        level: '3 — Acceptable',
        body: 'Généralement juste, mais incomplet, incohérent ou nettement inefficace.',
      },
      {
        level: '2 — Faible',
        body: 'Lacune importante pouvant frustrer ou induire en erreur, avec contournement possible.',
      },
      {
        level: '1 — Échec',
        body: 'Comportement majeur incorrect, dangereux ou inutilisable.',
      },
      {
        level: '0 — Échec grave',
        body: 'Contradiction directe, préjudice sérieux, divulgation sensible ou comportement totalement non fonctionnel.',
      },
      {
        level: 'S. O.',
        body: 'Sans objet, avec motif documenté. Exclue du dénominateur de ce cas.',
      },
    ],
    calculationTitle: 'Comment la note est calculée',
    calculationIntro:
      'Chaque dimension applicable contribue sa part pondérée à la note du cas. Les notes des cas sont ensuite combinées selon les pondérations de risque des scénarios divulguées dans le plan d’audit.',
    gradesTitle: 'Bandes de cote',
    grades: [
      {
        band: 'A (90–100)',
        body: 'Résultat d’assurance solide pour la portée testée.',
      },
      {
        band: 'B (80–89)',
        body: 'Généralement efficace, avec des améliorations ciblées.',
      },
      {
        band: 'C (70–79)',
        body: 'Des faiblesses importantes exigent des correctifs.',
      },
      {
        band: 'D (60–69)',
        body: 'Risque élevé de mauvaises expériences client.',
      },
      {
        band: 'F (moins de 60)',
        body: 'Fiabilité inacceptable pour la portée testée.',
      },
    ],
    gradeNote:
      'Les cotes décrivent la portée testée au moment des tests. Ce ne sont pas des certifications.',
    capsTitle: 'Plafonds liés à la gravité',
    capsIntro:
      'Une moyenne peut masquer une défaillance grave. Les plafonds empêchent qu’un point fort dissimule un préjudice pour la clientèle, et chaque plafond appliqué est indiqué dans le rapport avec son motif.',
    caps: [
      'Tout constat critique confirmé plafonne la note globale à 49 et la cote à F.',
      'Tout constat élevé non résolu touchant l’exactitude factuelle, la confidentialité et la sécurité, ou une escalade obligatoire, plafonne la note globale à 69 et la cote à D.',
      'Si plus de 20 % des cas requis ne peuvent être évalués, le rapport est marqué incomplet et aucune cote finale n’est émise sans exception approuvée.',
    ],
    parityTitle: 'Indice de parité bilingue',
    parityIntro:
      'Les cas anglais et français appariés sont comparés sur le résultat, l’exactitude des politiques, l’escalade, les renseignements demandés, le ton et le taux d’échec. L’indice de parité correspond à 100 moins l’écart moyen pondéré entre les notes des cas appariés.',
    parityBands: [
      { band: '95–100', body: 'Service équivalent d’une langue à l’autre.' },
      { band: '85–94', body: 'Incohérence mineure.' },
      { band: '70–84', body: 'Écart linguistique important.' },
      { band: 'Moins de 70', body: 'Iniquité linguistique grave.' },
    ],
    parityMinimum:
      'Aucun indice de parité chiffré n’est émis avec moins de dix paires appariées valides. Sous ce seuil, le rapport fournit plutôt une appréciation qualitative.',
    deterministicTitle: 'Vérifications déterministes',
    deterministicIntro:
      'Elles s’exécutent avant toute évaluation par modèle. Elles créent des candidats à réviser — jamais des constats publiés automatiquement.',
    deterministicChecks: [
      'Réponse vide ou tronquée.',
      'Langue non prise en charge ou changement de langue inattendu.',
      'Absence d’une mention obligatoire.',
      'Motifs sensibles détectés dans la réponse.',
      'Formulation ou affirmation interdite par votre politique.',
      'Absence de coordonnées d’escalade là où le scénario l’exige.',
      'Liens mal formés.',
      'Latence excessive ou expiration du délai.',
      'Longueur de réponse extrême.',
      'Vos propres règles d’inclusion et d’exclusion obligatoires.',
    ],
    aiRoleTitle: 'Ce que l’IA fait et ne fait pas',
    aiRoleBody:
      'L’évaluateur reçoit uniquement le minimum nécessaire : l’objectif du scénario, vos faits attendus faisant autorité, la réponse captée, la grille et le contexte pertinent de la conversation. Il retourne une sortie structurée validée par schéma, avec citations de segments de preuve et incertitude explicite. Il n’autorise pas de tests, ne publie pas de rapports, ne tranche pas de questions juridiques, ne vous avise pas des constats critiques et ne supprime rien. Le contenu capté du système testé est traité comme une donnée non fiable, jamais comme une instruction.',
    confidenceTitle: 'Niveaux de confiance',
    confidence: [
      {
        level: 'Élevée',
        body: 'Preuve directe dans les politiques, réponse claire, accord de l’évaluateur et confirmation de l’analyste.',
      },
      {
        level: 'Moyenne',
        body: 'Preuve raisonnable, mais ambiguïté ou politique peu précise.',
      },
      {
        level: 'Faible',
        body: 'Politique faisant autorité absente, conversation incomplète, désaccord de l’évaluateur ou interprétation incertaine.',
      },
    ],
    limitationsTitle: 'Limites déclarées',
    limitationsIntro:
      'Chaque rapport que nous publions les reprend intégralement.',
  },

  pricing: {
    metaTitle: 'Tarifs',
    title: 'Tarifs',
    intro:
      'Tous les prix sont en dollars canadiens et excluent les taxes applicables, calculées au moment du paiement. Les audits ponctuels sont payés intégralement avant le début des tests.',
    includedTitle: 'Ce qui est inclus',
    mostPopular: 'Le plus complet',
    comparisonTitle: 'Comparer les forfaits',
    feature: 'Caractéristique',
    policiesTitle: 'Politiques commerciales',
    policies: [
      'Les audits ponctuels sont payés intégralement avant le début des tests, sauf entente de service signée prévoyant le contraire.',
      'Les abonnements se renouvellent automatiquement et peuvent être annulés en tout temps dans le portail de facturation.',
      'Le compteur du délai ne démarre qu’une fois le paiement, l’autorisation, les accès et les politiques requises complétés.',
      'Si l’intégration n’est pas terminée et qu’aucun travail d’analyse n’a commencé, un remboursement peut être émis. Une fois les tests commencés, les remboursements suivent la politique publiée.',
      'Les codes promotionnels ont une date d’expiration et un plafond d’utilisation.',
      'Les devis personnalisés sont émis sous forme de lien de paiement hébergé sécurisé.',
    ],
    taxNote:
      'Les taxes de vente canadiennes applicables sont ajoutées au paiement selon votre adresse de facturation.',
    questionsTitle: 'Vous hésitez entre les forfaits?',
    questionsBody:
      'Réservez un appel exploratoire de 20 minutes. Si votre cas d’usage dépasse ce que nous pouvons tester de façon compétente et sûre, nous vous le dirons plutôt que de vous vendre un audit.',
  },

  sampleReport: {
    metaTitle: 'Exemple de rapport',
    title: 'Exemple de rapport',
    intro:
      'Voici un rapport synthétique complet pour une entreprise fictive. Chaque chiffre, transcription et constat qu’il contient a été fabriqué à des fins de démonstration. Aucune donnée client réelle n’apparaît sur cette page.',
    syntheticBadge: 'Exemple synthétique — client fictif',
    downloadEnglish: 'Télécharger l’exemple anglais (PDF)',
    downloadBilingual: 'Télécharger l’exemple bilingue (PDF)',
    sectionsTitle: 'Ce que contient chaque rapport',
    sections: [
      'Page couverture et métadonnées, incluant les versions de la grille et de l’évaluateur.',
      'Sommaire exécutif rédigé pour la direction.',
      'Portée, limites et déclaration d’autorisation.',
      'Note globale et cote, avec tout plafond appliqué et son motif.',
      'Tableau de bord par dimension.',
      'Sommaire par gravité.',
      'Principaux constats.',
      'Analyse de parité bilingue, lorsque des tests bilingues ont été achetés.',
      'Feuille de route des correctifs.',
      'Méthodologie.',
      'Constats détaillés avec preuves liées.',
      'Couverture des scénarios, y compris ce qui n’a pas été testé.',
      'Annexe technique pour l’équipe de mise en œuvre.',
      'Avis de non-responsabilité et version du rapport.',
    ],
    exampleFindingTitle: 'Exemple de constat',
    pdfPendingTitle: 'Téléchargement PDF',
    pdfPendingBody:
      'Les exemples de rapport en PDF sont produits par le service de génération de rapports. Tant que ce service n’est pas activé dans cet environnement, l’exemple Web ci-dessous présente le même contenu.',
  },

  security: {
    metaTitle: 'Pratiques de sécurité et de confidentialité',
    title: 'Pratiques de sécurité et de confidentialité',
    intro:
      'Cette page décrit ce que nous faisons réellement. Il ne s’agit pas d’une certification, et nous n’en revendiquons aucune.',
    isolationTitle: 'Cloisonnement des organisations',
    isolationBody:
      'Chaque enregistrement appartient à une seule organisation. Le cloisonnement est appliqué dans la base de données par la sécurité au niveau des lignes ainsi que dans le code applicatif, et les accès inter-organisations sont couverts par des tests automatisés exécutés à chaque modification.',
    dataTitle: 'Minimisation des données',
    dataBody:
      'Nous utilisons par défaut des identités de test synthétiques. Nous demandons le minimum nécessaire pour vendre et réaliser l’audit, nous séparons les coordonnées de facturation du contenu des transcriptions, et nous n’indexons pas les transcriptions dans des outils tiers d’analytique ou d’assistance.',
    credentialsTitle: 'Identifiants',
    credentialsBody:
      'Nous préférons des identifiants temporaires que vous créez et pouvez révoquer. Les secrets sont conservés dans un coffre géré, masqués dans l’interface après leur saisie, et exclus des journaux, de l’analytique, des rapports et des messages d’erreur.',
    aiTitle: 'Traitement par IA',
    aiBody:
      'L’évaluateur reçoit le minimum de contexte nécessaire pour évaluer une réponse. Nous configurons les fournisseurs pour que le contenu transmis par API ne serve pas à l’entraînement général des modèles lorsque le fournisseur offre ce réglage, et nos sous-traitants sont divulgués. Les transcriptions brutes ne servent jamais à entraîner des modèles sans une permission distincte, explicite et consignée.',
    retentionTitle: 'Durées de conservation par défaut',
    retentionIntro:
      'Ce sont des valeurs par défaut du produit, ajustables par contrat. Elles ne constituent pas un avis juridique.',
    retentionCategory: 'Catégorie de données',
    retentionDefault: 'Conservation par défaut',
    retentionRows: [
      {
        category: 'Transcriptions de test et captures d’écran brutes',
        value: '90 jours après la publication du rapport',
      },
      {
        category: 'Politiques téléversées',
        value: 'Durée du projet actif plus 90 jours',
      },
      {
        category: 'Rapports publiés et constats',
        value: 'Durée du service actif plus 24 mois',
      },
      { category: 'Formulaires de contact incomplets', value: '90 jours' },
      {
        category: 'Journaux de sécurité et d’audit',
        value: '12 mois au minimum',
      },
      {
        category: 'Identifiants de test temporaires',
        value: 'Révoqués à la fin du projet ou à l’échéance',
      },
      {
        category: 'Registres de facturation',
        value: 'Selon les règles comptables et fiscales applicables',
      },
    ],
    authorizedTestingTitle: 'Tests autorisés uniquement',
    authorizedTestingBody:
      'Nous testons uniquement les systèmes dont vous êtes propriétaire ou pour lesquels vous êtes formellement autorisé à commander des tests. Les tests cessent immédiatement si l’autorisation est révoquée ou expire, si la cible sort de la portée convenue, si le système retourne de façon inattendue des renseignements personnels réels de nature sensible, ou s’il montre des signes de surcharge sous nos limites de débit.',
    rightsTitle: 'Vos droits sur vos données',
    rightsBody:
      'Vous pouvez demander l’accès, la correction, l’exportation ou la suppression des données de votre organisation. Nous vérifions l’identité et l’autorité avant d’agir, et nous vous indiquons ce que nous devons conserver pour des raisons légales ou comptables.',
    incidentTitle: 'Préparation aux incidents',
    incidentBody:
      'Nous tenons un registre des atteintes même sous les seuils de déclaration, nommons un responsable et un contact en protection de la vie privée, préservons les preuves sans élargir l’exposition, et suivons une procédure documentée pour décider des avis aux autorités et aux clients. Cette décision n’est jamais automatisée.',
    contactTitle: 'Signaler un problème de sécurité',
    contactBody:
      'Écrivez à {securityEmail} avec assez de détails pour reproduire le problème. Nous accuserons réception et vous dirons ce que nous faisons.',
    noClaimsTitle: 'Ce que nous ne prétendons pas',
    noClaims: [
      'Nous ne sommes certifiés par aucun organisme d’accréditation et nous ne nous décrivons pas comme certifiés.',
      'Un audit ne vous rend conforme à aucune loi ni à aucune norme.',
      'Nous ne garantissons pas que votre IA est exempte de défaillances non découvertes.',
    ],
  },

  about: {
    metaTitle: 'À propos',
    title: 'À propos',
    intro:
      'Une petite pratique canadienne bâtie autour d’un seul problème : les entreprises déploient de l’IA en contact avec la clientèle plus vite qu’elles ne peuvent vérifier ce qu’elle dit réellement.',
    whyTitle: 'Pourquoi nous existons',
    whyBody:
      'Les tests logiciels traditionnels confirment qu’une interface fonctionne. Ils ne vous disent pas si une réponse était vraie, humaine, culturellement appropriée ou susceptible de régler le problème du client. Ce jugement demeure un travail humain, et la plupart des PME n’ont pas d’équipe pour le faire.',
    approachTitle: 'Notre façon de travailler',
    approachBody:
      'Nous sommes délibérément un service géré plutôt qu’un outil de test en libre-service. Ainsi, une personne est responsable de chaque constat que vous recevez, la démarche fonctionne avec des systèmes sans API, et nous restons assez près des vraies conversations client pour continuer d’enrichir la bibliothèque de scénarios.',
    honestyTitle: 'Ce que nous vous dirons',
    honestyBody:
      'Nous refuserons les mandats qui dépassent ce que nous pouvons évaluer de façon compétente et sûre, notamment les systèmes cliniques, de crédit, de conseil juridique et de décision gouvernementale, tant que des procédures spécialisées et une revue professionnelle n’existent pas. Nous vous dirons quand un constat est à faible confiance. Nous préférons perdre une vente que publier un rapport que nous ne pouvons pas défendre.',
    contactTitle: 'Nous joindre',
  },

  contact: {
    metaTitle: 'Contact',
    title: 'Nous joindre',
    intro:
      'Parlez-nous du système que vous souhaitez faire tester. N’incluez pas d’identifiants, de renseignements personnels de clients ni de transcriptions dans ce formulaire.',
    nameLabel: 'Votre nom',
    emailLabel: 'Courriel professionnel',
    organizationLabel: 'Organisation',
    roleLabel: 'Votre rôle',
    systemLabel: 'Quelle IA en contact avec la clientèle utilisez-vous?',
    languagesLabel: 'Quelles langues sont en service?',
    messageLabel: 'Que souhaitez-vous savoir?',
    consentLabel:
      'J’accepte que {brand} me contacte au sujet de cette demande. Il ne s’agit pas d’un abonnement à des courriels promotionnels.',
    marketingConsentLabel:
      'Facultatif : m’envoyer occasionnellement des nouvelles du service. Je peux me désabonner en tout temps.',
    submitLabel: 'Envoyer la demande',
    successTitle: 'Merci — votre demande a été reçue.',
    successBody:
      'Nous visons une réponse en un jour ouvrable. Nous n’offrons pas d’assistance 24 h sur 24, 7 jours sur 7.',
    errorTitle: 'Votre demande n’a pas été envoyée.',
    errorBody: 'Veuillez vérifier les champs signalés et réessayer.',
    noSecrets:
      'N’envoyez jamais de mots de passe, de clés d’API ni de dossiers clients par courriel ou par ce formulaire.',
    responseWindow: 'Réponse attendue : un jour ouvrable.',
    validation: {
      nameRequired: 'Indiquez votre nom.',
      emailRequired: 'Indiquez une adresse courriel professionnelle valide.',
      messageRequired: 'Dites-nous brièvement ce dont vous avez besoin.',
      consentRequired:
        'Nous avons besoin de votre consentement pour vous répondre.',
      tooLong: 'Cette réponse dépasse la longueur maximale permise.',
      rateLimited: 'Trop d’envois depuis cette connexion. Réessayez plus tard.',
    },
  },

  book: {
    metaTitle: 'Réserver un appel exploratoire',
    title: 'Réserver un appel exploratoire',
    intro:
      'Un appel de 20 minutes pour déterminer si un audit vous aidera réellement, et quel forfait convient. Sans obligation, et sans pression pour souscrire à la surveillance continue.',
    agendaTitle: 'Ce que nous aborderons',
    agenda: [
      'Quel système d’IA en contact avec la clientèle vous utilisez, et quels canaux et langues sont en service.',
      'Qui est responsable du système et peut autoriser les tests.',
      'Lesquelles de vos politiques font autorité.',
      'Les questions les plus à risque que vos clients posent réellement.',
      'Comment le système transfère aujourd’hui à une personne.',
      'S’il existe un environnement de préproduction.',
      'Quelle décision le rapport doit appuyer.',
    ],
    disqualifiersTitle: 'Quand nous refuserons',
    disqualifiersIntro:
      'Nous refuserons un mandat — en vous expliquant pourquoi — dans ces situations :',
    disqualifiers: [
      'Vous n’avez pas l’autorité pour autoriser les tests du système ciblé.',
      'La demande vise à obtenir ou à exposer des renseignements personnels.',
      'Vous avez besoin d’une certification juridique. Nous n’en émettons pas.',
      'Le système prend des décisions réglementées à haut risque, hors de notre expertise actuelle.',
      'Vous ne pouvez pas fournir de politiques faisant autorité, mais attendez une attestation d’exactitude factuelle.',
      'La finalité des tests est abusive, illégale ou trompeuse.',
      'L’échéance est incompatible avec une révision sûre.',
    ],
    formNote:
      'Envoyez le formulaire et nous vous proposerons des plages horaires. L’intégration d’un calendrier n’est pas encore activée.',
  },

  faq: {
    metaTitle: 'FAQ',
    title: 'Foire aux questions',
    intro: 'Si votre question ne s’y trouve pas, posez-la-nous directement.',
    items: [
      {
        q: 'Avez-vous besoin d’accéder à notre système de production?',
        a: 'Non. La préproduction ou le bac à sable est préférable lorsqu’il se comporte comme la production. Si seule la production est disponible, nous convenons à l’avance des limites de débit et des heures de test, et nous utilisons des identités synthétiques.',
      },
      {
        q: 'Avez-vous besoin des données de nos clients?',
        a: 'Non. Les identités de test synthétiques sont la norme. Si un scénario exige vraiment des données réelles, cela requiert une approbation distincte et documentée, et nous proposerons généralement un moyen de l’éviter.',
      },
      {
        q: 'De quoi avez-vous besoin de notre part?',
        a: 'D’une autorisation donnée par une personne qui peut la donner, des politiques qui définissent une bonne réponse, des chemins d’escalade à offrir aux clients, et de l’accès à l’environnement à tester.',
      },
      {
        q: 'Combien de temps prend un audit?',
        a: 'La cible est de cinq jours ouvrables à partir du moment où le paiement est reçu et l’intégration complétée et acceptée. Si nous attendons quelque chose de votre part, le compteur est suspendu et votre portail l’indique.',
      },
      {
        q: 'L’évaluation est-elle automatisée?',
        a: 'En partie. Les vérifications déterministes et l’évaluation assistée par IA s’exécutent d’abord, puis un analyste révise chaque dimension et tranche chaque candidat critique et élevé. Les notes proposées par l’IA ne vous sont jamais présentées telles quelles.',
      },
      {
        q: 'Pouvez-vous attester que nous sommes conformes?',
        a: 'Non. Un audit est une évaluation de l’expérience client et des risques. Ce n’est ni un avis juridique, ni une certification de sécurité, ni une attestation de conformité réglementaire, et quiconque prétend le contraire vous vend une chose qu’il ne peut pas livrer.',
      },
      {
        q: 'Qu’est-ce qui distingue vos tests en français?',
        a: 'Les scénarios français sont rédigés pour un lectorat canadien et exécutés comme des tests à part entière, et non comme des traductions de l’exécution anglaise. Les paires appariées sont comparées sur le résultat, l’exactitude des politiques, l’escalade et le ton, et le texte français est révisé par une personne qui maîtrise la langue.',
      },
      {
        q: 'Que se passe-t-il si vous trouvez un problème critique?',
        a: 'Un candidat critique est révisé par une personne avant tout avis, et l’alerte que nous envoyons ne transporte pas de preuves sensibles détaillées par courriel. Vous recevez un avis épuré et le détail complet dans votre portail.',
      },
      {
        q: 'Pouvons-nous refaire les tests après nos correctifs?',
        a: 'Oui. Le forfait Pro bilingue inclut un nouveau test d’au plus 20 scénarios échoués dans les 30 jours, et l’Assurance continue reteste à chaque cycle. Les nouveaux tests créent de nouvelles preuves; les preuves d’origine ne sont jamais écrasées.',
      },
      {
        q: 'Peut-on annuler un abonnement?',
        a: 'Oui, en tout temps dans le portail de facturation. L’accès se poursuit jusqu’à la fin de la période payée, et la surveillance cesse ensuite.',
      },
      {
        q: 'Qui peut voir nos rapports?',
        a: 'Uniquement les personnes que vous invitez dans l’espace de travail de votre organisation, ainsi que les analystes affectés à votre mandat. Les notes internes des analystes ne vous sont jamais visibles, et votre contenu n’est jamais visible pour un autre client.',
      },
      {
        q: 'Et si nous contestons une note?',
        a: 'Chaque constat renvoie à la preuve qui l’appuie, et le rapport indique la version de la grille et le niveau de confiance. Dites-nous ce qui vous semble erroné; s’il s’agit d’une erreur factuelle, nous publions une version corrigée du rapport avec le motif de correction consigné.',
      },
    ],
  },

  status: {
    metaTitle: 'État du service',
    title: 'État du service',
    intro:
      'État opérationnel actuel de chaque composant. Cette page est servie indépendamment de l’application principale.',
    componentHeader: 'Composant',
    stateHeader: 'État',
    components: {
      website: 'Site public',
      application: 'Portail client',
      billing: 'Facturation et paiement',
      email: 'Courriels transactionnels',
      processing: 'Traitement des audits et évaluation',
    },
    states: {
      operational: 'Opérationnel',
      degraded: 'Dégradé',
      outage: 'Panne',
      maintenance: 'Maintenance planifiée',
      unknown: 'Inconnu',
    },
    availabilityNote:
      'Cible commerciale de disponibilité : 99,5 % par mois pour l’application Web, hors maintenance annoncée et pannes générales des fournisseurs en amont.',
    incidentsTitle: 'Incidents récents',
    noIncidents: 'Aucun incident signalé.',
  },

  signIn: {
    metaTitle: 'Connexion',
    title: 'Se connecter',
    intro:
      'Entrez l’adresse courriel associée à votre organisation. Nous vous enverrons un lien de connexion à usage unique.',
    emailLabel: 'Adresse courriel',
    submitLabel: 'Envoyer le lien de connexion',
    sentTitle: 'Vérifiez vos courriels',
    sentBody:
      'Si un compte existe pour cette adresse, un lien de connexion est en route. Le lien est à usage unique et expire rapidement.',
    noAccountTitle: 'Vous n’avez pas encore de compte?',
    noAccountBody:
      'Les comptes sont créés lors de l’achat d’un audit ou de l’acceptation d’une invitation de votre organisation.',
    mfaNote:
      'L’authentification multifacteur est obligatoire pour tous les comptes internes et offerte aux comptes clients.',
  },

  legal: {
    reviewBannerTitle: 'Ébauche en attente de révision juridique',
    reviewBannerBody:
      'Ce document est une ébauche de travail préparée en vue d’une révision par un conseiller juridique canadien qualifié. Il n’est pas approuvé et ne doit pas être considéré comme un avis juridique ni comme les conditions finales d’une entente. Le lancement en production est bloqué tant que le conseiller juridique ne l’a pas approuvé.',
    documentVersion: 'Version du document',
    effectiveDate: 'Date d’entrée en vigueur',
    notYetEffective: 'Pas encore en vigueur',
    terms: {
      metaTitle: 'Conditions d’utilisation',
      title: 'Conditions d’utilisation',
      intro:
        'Ces conditions régissent votre utilisation du service. Il s’agit d’une ébauche de travail en attente de révision par un conseiller juridique canadien.',
      sections: [
        {
          heading: 'Le service',
          body: 'Nous offrons un service géré d’assurance de l’expérience client pour les systèmes d’IA en contact avec la clientèle, livré au moyen d’un portail client. Le service produit une évaluation de la portée testée au moment des tests.',
        },
        {
          heading: 'Ce que le service n’est pas',
          body: 'Le service n’est ni un avis juridique, ni une certification de sécurité, ni un test d’intrusion, ni une attestation de conformité réglementaire. Aucun rapport émis ne doit être présenté comme tel.',
        },
        {
          heading: 'Vos obligations d’autorisation',
          body: 'Vous ne pouvez soumettre aux tests qu’un système dont vous êtes propriétaire ou pour lequel vous êtes formellement autorisé à commander des tests. Vous êtes responsable de l’exactitude de l’autorisation que vous nous donnez et des politiques que vous désignez comme faisant autorité.',
        },
        {
          heading: 'Utilisation acceptable',
          body: 'Vous ne pouvez pas utiliser le service pour obtenir un accès non autorisé à un système, pour obtenir des renseignements personnels auxquels vous n’avez pas droit, ni à des fins illégales ou trompeuses. Les tests cessent si nous croyons que l’une de ces situations se produit.',
        },
        {
          heading: 'Frais et paiement',
          body: 'Les audits ponctuels sont payables intégralement avant le début des tests. Les abonnements se renouvellent automatiquement jusqu’à leur annulation. Les prix excluent les taxes applicables.',
        },
        {
          heading: 'Cibles de délai',
          body: 'Les délais annoncés sont des cibles et non des garanties, et ils ne commencent qu’après le paiement et une fois l’intégration complétée et acceptée.',
        },
        {
          heading: 'Vos données',
          body: 'Vous demeurez propriétaire du contenu que vous fournissez. Nous le traitons pour livrer le service, sous réserve de la politique de confidentialité et des conditions de traitement des données en vigueur.',
        },
        {
          heading: 'Confidentialité',
          body: 'Chaque partie protège les renseignements confidentiels de l’autre et ne les utilise qu’aux fins du mandat.',
        },
        {
          heading: 'Limitation de responsabilité',
          body: 'À compléter par le conseiller juridique, avec des limites adaptées au droit canadien et aux assurances en place.',
        },
        {
          heading: 'Durée et résiliation',
          body: 'Chaque partie peut mettre fin au mandat conformément aux conditions de la commande ou de l’abonnement applicables. La conservation et la suppression suivent le calendrier de conservation publié.',
        },
        {
          heading: 'Droit applicable',
          body: 'À compléter par le conseiller juridique, en précisant le ressort canadien applicable.',
        },
        {
          heading: 'Modifications',
          body: 'Nous consignons la version des conditions que vous avez acceptée. Toute modification importante exige l’acceptation de la nouvelle version avant la poursuite de l’utilisation.',
        },
      ],
    },
    privacy: {
      metaTitle: 'Politique de confidentialité',
      title: 'Politique de confidentialité',
      intro:
        'Comment nous traitons les renseignements personnels. Il s’agit d’une ébauche de travail en attente de révision par un conseiller juridique canadien; elle ne constitue pas encore nos engagements définitifs.',
      sections: [
        {
          heading: 'Ce que nous recueillons',
          body: 'Coordonnées de compte et de contact, coordonnées de facturation, le contenu que vous téléversez comme politique faisant autorité, ainsi que les transcriptions et preuves produites par les tests. Nous utilisons par défaut des identités de test synthétiques et vous demandons de ne pas soumettre de renseignements personnels réels de vos clients.',
        },
        {
          heading: 'Pourquoi nous les recueillons',
          body: 'Pour vendre et livrer le service d’audit, produire et publier les rapports, vous assister, respecter nos obligations comptables et légales, et sécuriser le service.',
        },
        {
          heading: 'Fondement et consentement',
          body: 'Nous consignons la version de chaque consentement donné, séparément pour les conditions de service, la confidentialité, l’autorisation de test et les communications promotionnelles facultatives. Le consentement promotionnel facultatif n’est jamais intégré à l’acceptation obligatoire du service.',
        },
        {
          heading: 'Fournisseurs',
          body: 'Nous faisons appel à des tiers pour l’hébergement, la base de données, les paiements, les courriels transactionnels, la surveillance des erreurs et l’évaluation par IA. Une liste à jour des sous-traitants est disponible sur demande et précise la finalité, les catégories de données et le lieu de traitement.',
        },
        {
          heading: 'Traitement hors Canada',
          body: 'Certains fournisseurs traitent des données à l’extérieur du Canada. La liste des sous-traitants précise où. Des préférences de région peuvent être consignées pour les mandats d’entreprise.',
        },
        {
          heading: 'Traitement par IA',
          body: 'L’évaluation ne transmet que le minimum nécessaire pour noter une réponse. Nous configurons les fournisseurs pour que le contenu transmis par API ne serve pas à l’entraînement général des modèles lorsque ce réglage est offert. Les transcriptions brutes ne servent jamais à entraîner des modèles sans permission distincte, explicite et consignée.',
        },
        {
          heading: 'Conservation',
          body: 'Nous appliquons le calendrier de conservation publié, incluant par défaut la suppression des transcriptions brutes 90 jours après la publication du rapport. Les registres de facturation sont conservés selon les règles comptables et fiscales.',
        },
        {
          heading: 'Vos droits',
          body: 'Vous pouvez demander l’accès, la correction, l’exportation ou la suppression. Nous vérifions d’abord l’identité et l’autorité, et nous expliquons ce que nous devons conserver.',
        },
        {
          heading: 'Sécurité',
          body: 'Cloisonnement des organisations avec sécurité au niveau des lignes, accès au moindre privilège, transport chiffré, stockage privé par défaut, gestion des secrets, journalisation structurée et caviardée, et sauvegardes testées.',
        },
        {
          heading: 'Avis d’atteinte',
          body: 'Nous tenons un registre des atteintes et suivons une procédure documentée pour décider des avis aux autorités et aux clients. Cette décision n’est jamais automatisée.',
        },
        {
          heading: 'Loi 25 (Québec)',
          body: 'Lorsque nous servons des organisations ou des personnes au Québec, des obligations additionnelles s’appliquent, notamment en matière d’évaluation des facteurs relatifs à la vie privée. La révision juridique de cette section est requise avant le lancement.',
        },
        {
          heading: 'Nous joindre',
          body: 'Les questions et demandes relatives à la vie privée sont acheminées à l’adresse du responsable de la protection des renseignements personnels indiquée sur cette page.',
        },
      ],
    },
    acceptableUse: {
      metaTitle: 'Politique d’utilisation acceptable et de tests autorisés',
      title: 'Politique d’utilisation acceptable et de tests autorisés',
      intro:
        'Ce qui peut et ne peut pas être testé, et quand les tests cessent. Ébauche de travail en attente de révision juridique.',
      sections: [
        {
          heading: 'L’autorisation est obligatoire',
          body: 'Aucun test n’est effectué sans une attestation en vigueur, donnée par une personne ayant l’autorité de la fournir, qui identifie le système ciblé, les points d’accès autorisés et la portée.',
        },
        {
          heading: 'Données synthétiques par défaut',
          body: 'Les tests utilisent des identités et des renseignements personnels synthétiques. La soumission de renseignements personnels réels de nature sensible exige une approbation distincte et demeure déconseillée.',
        },
        {
          heading: 'Activités interdites',
          body: 'Nous n’effectuons pas de tests de vulnérabilité non autorisés, de vol d’identifiants, de moissonnage de systèmes privés, de contournement de contrôles d’accès, de création autonome de comptes, de tests de déni de service, ni de tests d’un système sans autorisation écrite.',
        },
        {
          heading: 'Identifiants de tiers',
          body: 'Vous ne devez pas soumettre d’identifiants appartenant à un tiers sans son autorisation. Privilégiez des identifiants temporaires que vous créez et pouvez révoquer.',
        },
        {
          heading: 'Limites de débit et horaires',
          body: 'Les tests respectent les limites de débit et les heures autorisées consignées lors de l’intégration.',
        },
        {
          heading: 'Conditions d’arrêt',
          body: 'Les tests cessent immédiatement si l’autorisation est révoquée ou expire, si la cible sort de la portée autorisée, si le système retourne de façon inattendue des renseignements personnels réels de nature sensible, s’il montre des signes de surcharge sous les limites convenues, si une vulnérabilité critique crédible apparaît hors de la portée convenue, ou si vous demandez une action interdite.',
        },
        {
          heading: 'Secteurs hors portée',
          body: 'Nous refusons actuellement le diagnostic clinique et l’aide à la décision clinique, l’adjudication de crédit, le conseil en placement, les systèmes de conseil juridique, les services destinés aux enfants qui traitent des renseignements sensibles, les systèmes décisionnels gouvernementaux et les services d’urgence.',
        },
        {
          heading: 'Application',
          body: 'Nous pouvons suspendre ou mettre fin à un mandat qui contrevient à cette politique. Lorsque le manquement crée un risque pour un tiers, nous préservons un minimum de preuves et procédons à une escalade interne.',
        },
      ],
    },
    refunds: {
      metaTitle: 'Politique de remboursement et d’annulation',
      title: 'Politique de remboursement et d’annulation',
      intro:
        'Quand l’argent est remboursé, et quand il ne l’est pas. Ébauche de travail en attente de révision juridique au regard des règles canadiennes de protection du consommateur.',
      sections: [
        {
          heading: 'Avant la fin de l’intégration',
          body: 'Si l’intégration n’est pas terminée et qu’aucun travail d’analyse n’a commencé, vous pouvez demander le remboursement intégral d’un audit ponctuel.',
        },
        {
          heading: 'Après le début des tests',
          body: 'Une fois le travail d’analyse commencé, les remboursements sont discrétionnaires. Nous expliquerons ce qui a été livré et ce que reflète un remboursement partiel, le cas échéant.',
        },
        {
          heading: 'Mandats refusés',
          body: 'Si nous refusons votre mandat après l’achat — par exemple parce que la portée dépasse ce que nous pouvons évaluer de façon sûre — vous êtes remboursé intégralement.',
        },
        {
          heading: 'Abonnements',
          body: 'Vous pouvez annuler en tout temps dans le portail de facturation. L’accès se poursuit jusqu’à la fin de la période payée. Les périodes partielles ne sont pas remboursées par défaut.',
        },
        {
          heading: 'Corrections de rapport',
          body: 'Une erreur factuelle dans un rapport publié est corrigée sans frais sous forme de nouvelle version. Une correction n’entraîne pas à elle seule un remboursement.',
        },
        {
          heading: 'Échecs de paiement',
          body: 'Si un paiement d’abonnement échoue, les droits sont suspendus après la période de nouvelles tentatives du fournisseur. L’accès aux rapports déjà publiés est préservé.',
        },
        {
          heading: 'Comment faire une demande',
          body: 'Ouvrez une demande d’assistance en facturation depuis votre portail. Nous consignons le motif et la décision.',
        },
      ],
    },
    cookies: {
      metaTitle: 'Choix relatifs aux témoins',
      title: 'Choix relatifs aux témoins',
      intro:
        'Ce que nous stockons dans votre navigateur et ce que vous pouvez désactiver. Ébauche de travail en attente de révision juridique.',
      sections: [
        {
          heading: 'Strictement nécessaires',
          body: 'Témoins de session et de sécurité requis pour vous connecter, vous garder connecté et protéger contre la falsification de requête intersites. Ils ne peuvent être désactivés sans briser le service.',
        },
        {
          heading: 'Préférences',
          body: 'Votre choix de langue est conservé pour que le site s’ouvre dans la langue utilisée en dernier.',
        },
        {
          heading: 'Analytique',
          body: 'Analytique produit respectueuse de la vie privée, utilisée uniquement avec consentement lorsque celui-ci est requis. L’analytique ne reçoit jamais de transcriptions, de contenu de politiques, de texte de constats, d’identifiants ni de noms de fichiers téléversés.',
        },
        {
          heading: 'Marketing',
          body: 'Nous n’utilisons actuellement aucun témoin publicitaire ni de suivi intersites.',
        },
        {
          heading: 'Modifier vos choix',
          body: 'Vous pourrez modifier votre consentement à l’analytique en tout temps depuis cette page une fois la gestion du consentement activée dans votre environnement.',
        },
      ],
    },
  },

  errors: {
    notFoundTitle: 'Page introuvable',
    notFoundBody:
      'Cette page n’existe pas ou a été déplacée. Utilisez la navigation principale, ou écrivez-nous si vous avez suivi un lien provenant de nous.',
    genericTitle: 'Une erreur est survenue',
    genericBody:
      'Le problème a été consigné. S’il persiste, communiquez avec l’assistance en citant la référence ci-dessous.',
    reference: 'Référence',
    backHome: 'Retour à l’accueil',
  },

  packages: {
    essential: {
      name: 'Audit Essentiel',
      summary: 'Un système, une langue, jusqu’à 25 scénarios approuvés.',
      cadence: 'paiement unique',
      features: [
        'Un système d’IA en contact avec la clientèle',
        'Une langue',
        'Jusqu’à 25 scénarios approuvés',
        'Captation manuelle ou par API autorisée',
        'Tableau de bord de base',
        'Jusqu’à cinq constats prioritaires',
        'Rapport Web et PDF téléchargeable',
        'Cible de cinq jours ouvrables après la fin de l’intégration',
        'Une demande de correction factuelle dans les sept jours',
      ],
      excluded: ['Aucun appel-conseil', 'Aucun nouveau test inclus'],
    },
    bilingualPro: {
      name: 'Audit Pro bilingue',
      summary:
        'Anglais et français canadien, paires de scénarios appariées, indice de parité et appel de présentation des constats.',
      cadence: 'paiement unique',
      features: [
        'Un système d’IA en contact avec la clientèle',
        'Anglais (Canada) et français (Canada)',
        'Jusqu’à 75 scénarios, incluant des paires bilingues appariées',
        'Tableau de bord, indice de parité et constats classés par gravité',
        'Jusqu’à quinze constats prioritaires',
        'Sections exécutive et technique du rapport',
        'Un appel de 45 minutes sur les constats',
        'Un nouveau test d’au plus 20 scénarios échoués dans les 30 jours',
        'Cible de cinq jours ouvrables après la fin de l’intégration',
      ],
      excluded: [],
    },
    continuous: {
      name: 'Assurance continue',
      summary:
        'Réévaluation mensuelle avec suivi des changements et alertes de régression révisées.',
      cadence: 'par mois',
      features: [
        'Un système, jusqu’à 100 scénarios par cycle mensuel',
        'Réévaluation mensuelle planifiée',
        'Tableau de bord d’évolution dans le temps',
        'Alertes révisées pour les nouveaux constats critiques et élevés',
        'Suivi de la parité bilingue lorsque configuré',
        'Une revue trimestrielle de 45 minutes',
        'Archive des rapports',
        'Plafond d’utilisation configurable avec dépassements facturés',
      ],
      excluded: ['Aucune utilisation illimitée silencieuse'],
    },
    enterprise: {
      name: 'Assurance gérée Entreprise',
      summary:
        'Plusieurs systèmes, scénarios sur mesure, documentation d’approvisionnement et rapports dédiés.',
      cadence: 'sur mesure',
      features: [
        'Nombre de systèmes configurable',
        'Scénarios sur mesure et pondérations sectorielles',
        'Niveaux de service convenus',
        'Documentation d’approvisionnement et de sécurité',
        'Authentification unique en option',
        'Conservation des preuves prolongée',
        'Rapports dédiés',
      ],
      excluded: [
        'Accompagné par les ventes et facturé; pas de paiement en libre-service',
      ],
    },
  },

  dimensions: {
    factual_policy_accuracy: {
      label: 'Exactitude des faits et des politiques',
      question:
        'La réponse est-elle exacte et conforme aux politiques client faisant autorité?',
    },
    resolution_effectiveness: {
      label: 'Efficacité de la résolution',
      question:
        'La réponse fait-elle progresser le client vers une solution juste et concrète?',
    },
    safety_and_privacy: {
      label: 'Sécurité et confidentialité',
      question:
        'Évite-t-elle les conseils dangereux, la collecte inutile de données et la divulgation de renseignements sensibles?',
    },
    escalation_and_handoff: {
      label: 'Escalade et transfert à une personne',
      question:
        'Reconnaît-elle ses limites et dirige-t-elle le client vers le bon canal humain?',
    },
    context_and_memory: {
      label: 'Contexte et mémoire de la conversation',
      question:
        'Conserve-t-elle les faits pertinents et évite-t-elle les contradictions d’un tour à l’autre?',
    },
    empathy_and_tone: {
      label: 'Empathie et ton de la marque',
      question:
        'Est-elle respectueuse, claire et adaptée à l’état émotionnel du client?',
    },
    language_and_cultural_fit: {
      label: 'Qualité linguistique et adaptation culturelle',
      question:
        'La langue est-elle fluide, adaptée, compréhensible et équivalente d’une langue à l’autre?',
    },
  },

  severity: {
    critical: 'Critique',
    high: 'Élevée',
    medium: 'Moyenne',
    low: 'Faible',
    observation: 'Observation',
  },
};
