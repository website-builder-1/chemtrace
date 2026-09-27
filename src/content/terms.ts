// Chemtraceit Terms of Use and Confidentiality Agreement.
// Bump TERMS_VERSION whenever the text changes — every user must re-sign.
// DRAFT: prepared for review by a qualified solicitor before relying on it.
export const TERMS_VERSION = '1.0';
export const TERMS_EFFECTIVE = '27 September 2026';

export interface TermsSection { heading: string; body: string[] }

export const TERMS_TITLE = 'Chemtraceit Terms of Use and Confidentiality Agreement';

export const TERMS_INTRO = `These Terms of Use and Confidentiality Agreement ("Agreement") form a legally binding agreement between you ("you", "the User") and Chemtraceit ("Chemtraceit", "we", "us") governing your access to and use of the Chemtraceit platform, including the synthesis tool, research assistant, supplier and pricing information, reports and all related services and outputs (together, the "Platform"). By signing below you confirm that you have read, understood and agree to be bound by this Agreement. If you do not agree, you must not use the Platform.`;

export const TERMS_SECTIONS: TermsSection[] = [
  { heading: '1. Eligibility and authorised access', body: [
    '1.1 You must be at least 18 years of age to use the Platform. By signing you confirm that you are 18 or older and have full legal capacity to enter into this Agreement.',
    '1.2 The Platform is invite-only. Accounts are issued solely by Chemtraceit administrators or moderators. You may only use an account that was issued to you personally.',
    '1.3 If you use the Platform on behalf of an organisation, you confirm that you are authorised to bind that organisation to this Agreement, and "you" includes that organisation.',
    '1.4 The Platform is intended for professional, academic and industrial research use by persons with appropriate scientific training. It is not a consumer product.',
  ]},
  { heading: '2. Account security', body: [
    '2.1 You must change your temporary password on first sign-in and keep your credentials confidential. You must not share your account, password or session with any other person.',
    '2.2 You are responsible for all activity carried out under your account. Notify admin@chemtraceit.com immediately of any actual or suspected unauthorised access.',
    '2.3 We may suspend or disable any account at any time to protect the Platform, other users or the public.',
  ]},
  { heading: '3. Confidentiality', body: [
    '3.1 "Confidential Information" means all non-public information made available through the Platform, including its software, methods, models, databases, synthesis routes, reaction conditions, supplier data, pricing, reports, interface design, and any information about Chemtraceit\'s business, technology or clients.',
    '3.2 You must: (a) keep Confidential Information strictly confidential; (b) use it only for your own internal research purposes permitted by this Agreement; (c) not disclose it to any third party without our prior written consent, except to your own employees or advisers who need to know it and are bound by equivalent confidentiality obligations; and (d) protect it with at least a reasonable degree of care.',
    '3.3 You must not copy, screenshot for publication, publish, sell, or otherwise distribute Platform outputs, except for internal use within your organisation.',
    '3.4 These obligations do not apply to information that is or becomes public through no fault of yours, that you already lawfully held without restriction, or that you are required to disclose by law or a competent authority (in which case you will, where lawful, notify us promptly).',
    '3.5 Your confidentiality obligations survive termination of this Agreement for a period of five (5) years, and indefinitely for trade secrets.',
  ]},
  { heading: '4. Research use only — no professional advice', body: [
    '4.1 Platform outputs (including synthesis routes, reaction conditions, yields, properties, hazard information, costs and supplier suggestions) are computational suggestions generated from databases, algorithms and automated analysis. They may be incomplete, inaccurate or unsuitable for your purpose.',
    '4.2 Outputs are not validated laboratory procedures and do not constitute professional, safety, regulatory, legal or medical advice. Every output must be independently reviewed and verified by a suitably qualified chemist before any laboratory, pilot or manufacturing work is undertaken.',
    '4.3 Evidence labels (for example "documented", "analogous" or "hypothesis") indicate the source of a suggestion only; they are not a guarantee of correctness.',
    '4.4 Outputs must not be used for the manufacture of medicinal products, food, cosmetics or any product intended for human or animal use without full compliance with applicable regulatory requirements (including GMP).',
  ]},
  { heading: '5. Lawful use and prohibited activities', body: [
    '5.1 You must comply with all laws and regulations applicable to you and to any chemicals you research, acquire, handle, store, transport or dispose of, including (where applicable) the UK Misuse of Drugs Act 1971 and Misuse of Drugs Regulations 2001, the Psychoactive Substances Act 2016, the Chemical Weapons Act 1996 and the Chemical Weapons Convention, the Poisons Act 1972 and explosives precursor rules, the Explosives Regulations 2014, drug precursor controls (Regulations (EC) 273/2004 and 111/2005 as retained in UK law), the Export Control Order 2008 and UK and US dual-use and export control regimes, UK REACH and CLP, the Health and Safety at Work etc. Act 1974 and COSHH Regulations 2002, and their equivalents in your jurisdiction (including the US Controlled Substances Act and EU law).',
    '5.2 You must not use, or attempt to use, the Platform to research, design, synthesise, acquire or facilitate: (a) controlled drugs or psychoactive substances other than under a valid licence; (b) chemical or biological weapons or their precursors; (c) explosives or incendiary devices; (d) any substance for the purpose of causing harm to people, animals or the environment; or (e) any activity that breaches sanctions or export controls.',
    '5.3 You must not attempt to bypass the Platform\'s safety screening, rate limits or access controls.',
    '5.4 Chemtraceit screens and logs requests. We may refuse requests, suspend or terminate accounts, preserve records, and report suspected unlawful activity to law enforcement or regulatory authorities without notice to you.',
  ]},
  { heading: '6. Health, safety and environment', body: [
    '6.1 You are solely responsible for carrying out appropriate risk assessments (including COSHH assessments or local equivalents), providing suitable facilities, controls and personal protective equipment, and ensuring safe handling, storage, transport and waste disposal of all chemicals.',
    '6.2 Hazard, safety and regulatory information shown on the Platform is provided for convenience only and does not replace the supplier\'s Safety Data Sheet or your own professional assessment.',
  ]},
  { heading: '7. Pricing, suppliers and third parties', body: [
    '7.1 Prices, pack sizes, lead times, currency conversions and supplier links are indicative estimates only and are not offers or quotations. Always confirm with the supplier before ordering.',
    '7.2 Chemtraceit is not a party to any purchase you make from a third-party supplier and is not responsible for third-party websites, products, prices or availability.',
  ]},
  { heading: '8. Intellectual property and acceptable use', body: [
    '8.1 The Platform and all its content, software, databases and outputs are owned by or licensed to Chemtraceit. We grant you a limited, non-exclusive, non-transferable, revocable licence to use the Platform for your internal research during the term of this Agreement.',
    '8.2 You must not: copy, modify or create derivative works of the Platform; reverse engineer, decompile or attempt to extract source code, models or databases; use automated tools to scrape, crawl or bulk-download data; use the Platform to build a competing product; or resell or sublicense access.',
    '8.3 Any feedback, ratings or corrections you submit may be used by Chemtraceit to improve the Platform without obligation to you.',
  ]},
  { heading: '9. Data protection and privacy', body: [
    '9.1 Chemtraceit processes personal data in accordance with the UK General Data Protection Regulation and the Data Protection Act 2018 (and, where applicable, the EU GDPR).',
    '9.2 We collect your name, email address, organisation, account role, sign-in activity, the searches and questions you submit, saved results, feedback, technical data (such as IP address and browser information) and a record of your acceptance of this Agreement.',
    '9.3 We use this data to provide and secure the Platform, enforce this Agreement and applicable law (including misuse screening), prevent abuse, and improve our services. Our lawful bases are performance of a contract, our legitimate interests in operating a safe and secure service, and compliance with legal obligations.',
    '9.4 Account data is kept for the life of your account and for up to six (6) years afterwards for legal and audit purposes; usage logs are kept for as long as reasonably necessary for security and misuse prevention. Data may be processed by our hosting and infrastructure providers under appropriate safeguards.',
    '9.5 You have rights to access, rectify, erase, restrict or object to processing of your personal data and to data portability, and to complain to the Information Commissioner\'s Office (ico.org.uk). Contact admin@chemtraceit.com to exercise your rights.',
  ]},
  { heading: '10. Disclaimer of warranties', body: [
    '10.1 The Platform is provided "as is" and "as available". To the fullest extent permitted by law, Chemtraceit excludes all warranties, conditions and representations, express or implied, including as to accuracy, completeness, fitness for a particular purpose, availability and non-infringement.',
  ]},
  { heading: '11. Limitation of liability', body: [
    '11.1 Nothing in this Agreement limits or excludes liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be limited or excluded by law.',
    '11.2 Subject to clause 11.1, Chemtraceit shall not be liable for any loss of profit, revenue, data, business or goodwill, or any indirect or consequential loss, or for any loss, injury or damage arising from laboratory work, purchases or decisions made in reliance on Platform outputs.',
    '11.3 Subject to clause 11.1, Chemtraceit\'s total aggregate liability arising out of or in connection with this Agreement shall not exceed the greater of the fees paid by you for the Platform in the twelve (12) months preceding the claim and one hundred pounds sterling (£100).',
  ]},
  { heading: '12. Indemnity', body: [
    '12.1 You agree to indemnify Chemtraceit against all claims, losses, fines and costs (including reasonable legal fees) arising from your breach of this Agreement, your unlawful use of the Platform, or any laboratory, manufacturing or commercial activity you carry out using Platform outputs.',
  ]},
  { heading: '13. Suspension and termination', body: [
    '13.1 We may suspend or terminate your access at any time, with or without notice, including for breach of this Agreement or suspected misuse. You may stop using the Platform at any time by contacting us.',
    '13.2 On termination your licence ends immediately. Clauses 3, 4, 8, 9, 10, 11, 12 and 15 survive termination.',
  ]},
  { heading: '14. Changes to this Agreement', body: [
    '14.1 We may update this Agreement from time to time. When we do, we will ask you to review and sign the updated version before you can continue using the Platform.',
  ]},
  { heading: '15. General and governing law', body: [
    '15.1 This Agreement is the entire agreement between you and Chemtraceit regarding the Platform. If any provision is found unenforceable, the remainder stays in effect. A failure to enforce any right is not a waiver.',
    '15.2 You may not assign this Agreement. We may assign it to a successor business.',
    '15.3 This Agreement and any dispute arising from it (including non-contractual disputes) are governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction.',
    '15.4 Your electronic signature below has the same legal effect as a handwritten signature, in accordance with the Electronic Communications Act 2000 and UK eIDAS.',
    '15.5 Contact: admin@chemtraceit.com.',
  ]},
];
