import { LegalDocumentScreen, type LegalSection } from "../components/legal/LegalDocumentScreen";
import { SUPPORT_EMAIL } from "../lib/support";

const LAST_UPDATED = "August 20, 2026";

const INTRO = `These Terms of Service are being prepared. Until a full version is published, please use the Artie Apparel app lawfully and in accordance with our Privacy Policy. For questions, contact Artie Technology, Inc. at ${SUPPORT_EMAIL}.`;

const SECTIONS: LegalSection[] = [
  {
    heading: "Eligibility",
    body: "Coming soon.",
  },
  {
    heading: "Accounts",
    body: "Coming soon.",
  },
  {
    heading: "Purchases",
    body: "Coming soon.",
  },
  {
    heading: "Acceptable use",
    body: "Coming soon.",
  },
  {
    heading: "Contact",
    body: `Artie Technology, Inc. — ${SUPPORT_EMAIL}`,
  },
];

export default function TermsOfServiceScreen() {
  return (
    <LegalDocumentScreen lastUpdated={LAST_UPDATED} intro={INTRO} sections={SECTIONS} />
  );
}
