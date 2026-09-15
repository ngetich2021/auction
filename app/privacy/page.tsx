import Link from "next/link";
import { CallButton } from "@/components/ui/CallButton";

export const metadata = { title: "Privacy Policy — Auctions" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Back to Auctions
        </Link>
        <h1 className="text-xl font-bold">Privacy Policy</h1>
        <p className="text-xs text-zinc-400">Last updated: {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</p>
        <p className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
          This is a general template describing how Auctions currently handles data. It is provided
          for transparency and is not a substitute for legal advice — please have it reviewed by a
          qualified lawyer (including for Kenya’s Data Protection Act, 2019) before relying on it for
          compliance purposes.
        </p>
      </div>

      <Section title="1. What we collect">
        <p>
          <strong>Account information:</strong> your name, email address, and profile photo from Google
          sign-in, plus the phone number you add for contact and M-Pesa purposes.
        </p>
        <p>
          <strong>Listing content:</strong> anything you post — titles, descriptions, prices, photos, and
          the location you attach to a listing (auction item, mover, offer, or eatery).
        </p>
        <p>
          <strong>Location data:</strong> coordinates you share (via device location or manual entry) when
          browsing nearby listings or posting your own.
        </p>
        <p>
          <strong>Payment metadata:</strong> M-Pesa checkout/transaction references and receipt numbers for
          payments you make (listing fees, advertisement boosts, orders, blue-star badges). We do not
          receive or store your M-Pesa PIN or full card details — payments are processed directly by
          Safaricom’s Daraja API.
        </p>
        <p>
          <strong>Usage data:</strong> basic technical data (such as session cookies used to keep you
          signed in) needed to operate the site.
        </p>
      </Section>

      <Section title="2. How we use it">
        <p>
          To operate the marketplace: show your listings to nearby users, let you browse listings near a
          location you choose, process payments through M-Pesa, send transactional emails (order
          confirmations, advertisement approval/rejection notices, payment receipts), enforce these Terms,
          and improve the reliability of the service.
        </p>
      </Section>

      <Section title="3. Who we share it with">
        <p>
          We share data only as needed to run the service: Google (for sign-in), Safaricom/M-Pesa (to
          process payments), Cloudinary (to host listing photos), and our transactional email provider (to
          send you notifications). Your public listing details (title, price, photos, approximate location,
          phone number) are visible to other users so they can contact you — that’s the purpose of posting
          a listing. We do not sell your personal data to third parties.
        </p>
      </Section>

      <Section title="4. Data retention">
        <p>
          We keep account and listing data for as long as your account is active, or as needed to resolve
          disputes, enforce these Terms, or comply with legal obligations (for example, payment records).
          You can ask us to delete your account and associated data at any time, subject to what we’re
          legally required to retain (such as payment records).
        </p>
      </Section>

      <Section title="5. Your rights">
        <p>
          Depending on applicable law, you may have the right to access, correct, export, or delete your
          personal data, and to object to certain processing. Contact us using the details in your account
          settings to make a request.
        </p>
      </Section>

      <Section title="6. Security">
        <p>
          We use industry-standard practices to protect your data (encrypted connections, access controls),
          but no system is 100% secure. Please use a strong, unique password for your Google account and
          contact us if you suspect unauthorized access to your account.
        </p>
      </Section>

      <Section title="7. Children">
        <p>Auctions is not directed at children under 18, and we don’t knowingly collect data from them.</p>
      </Section>

      <Section title="8. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected by
          updating the &ldquo;Last updated&rdquo; date above.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>Questions about this Privacy Policy can be sent through the contacts provided.</p>
        <div className="flex flex-wrap items-center gap-3">
          <CallButton phone="0704876954" className="font-medium underline" />
          <Link href="/contact" className="underline">
            Contact page
          </Link>
        </div>
      </Section>
    </main>
  );
}
