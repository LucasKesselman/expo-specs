import { LegalDocumentScreen, type LegalSection } from "../components/legal/LegalDocumentScreen";
import { SUPPORT_EMAIL } from "../lib/support";

const LAST_UPDATED = "August 20, 2026";

const INTRO = `Artie Technology, Inc. (“Artie,” “we,” “us”) operates the Artie Apparel mobile app. This policy describes the information we collect, how we use it, and your choices. Questions: ${SUPPORT_EMAIL}.`;

const SECTIONS: LegalSection[] = [
  {
    heading: "Information we collect",
    body: [
      "Account. Email address, password (stored by Firebase Authentication, not in plaintext by us), first name, last name, and username.",
      "Profile and wardrobe. Saved digital and physical designs, garments linked to your account, and optional garment nicknames stored on your device.",
      "Content you provide. Marketplace and design images, AR design assets, and any other files you upload.",
      "Purchases. When you buy a physical design, Stripe processes payment. We receive order and fulfillment details needed to create and ship garments (for example email, shipping name/address, and order identifiers). We do not store full card numbers.",
      "Device permissions you grant. Camera (QR linking and AR), microphone (AR video capture), and photo library (design uploads and saving AR captures).",
      "On-device data. Auth session and some preferences (for example selected digital design and garment nicknames) via local storage.",
    ].join("\n\n"),
  },
  {
    heading: "How we use information",
    body: "To create and maintain your account; show marketplaces, wardrobe, and garment details; link garments from QR codes; run AR try-on and capture; process physical orders and shipping; store design assets; and respond to support requests.",
  },
  {
    heading: "How we share information",
    body: [
      "We do not sell your personal information. We use service providers that process data on our behalf:",
      "• Google Firebase (Authentication, Firestore, Cloud Storage, Cloud Functions)",
      "• Stripe (payments and checkout)",
      "• Shipping carriers, when an order is fulfilled",
      "We may disclose information if required by law or to protect Artie, our users, or others.",
    ].join("\n\n"),
  },
  {
    heading: "Retention and account deletion",
    body: "We keep account and order data while your account is active and as needed for fulfillment, security, and legal obligations. You can delete your account in the Account tab. Deletion removes your Artie account, profile, wardrobe saves, and on-device nicknames, and unlinks garments you owned so they can be claimed again. Some records (for example completed orders) may be retained as required for accounting or fraud prevention.",
  },
  {
    heading: "Your choices",
    body: `You can decline camera, microphone, or photo permissions in system settings (some features will not work). You can sign out at any time. You can delete your account in the Account tab, or contact ${SUPPORT_EMAIL} to request access or correction.`,
  },
  {
    heading: "Children",
    body: "The Artie Apparel app is not directed at children under 13, and we do not knowingly collect personal information from them.",
  },
  {
    heading: "Security",
    body: "We use industry-standard providers and transport encryption. No method of transmission or storage is 100% secure.",
  },
  {
    heading: "Changes",
    body: "We may update this policy as the product changes. The “Last updated” date at the top will change when we do. Continued use of the app after an update means you accept the revised policy.",
  },
  {
    heading: "Contact",
    body: `Artie Technology, Inc. — ${SUPPORT_EMAIL}`,
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentScreen
      lastUpdated={LAST_UPDATED}
      intro={INTRO}
      sections={SECTIONS}
      footer="This policy is provided for transparency and may be updated as the product evolves."
    />
  );
}
