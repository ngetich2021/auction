import Link from "next/link";

export const metadata = { title: "Terms & Conditions — Disposals" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Back to Disposals
        </Link>
        <h1 className="text-xl font-bold">Terms &amp; Conditions</h1>
        <p className="text-xs text-zinc-400">Last updated: {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</p>
        <p className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
          This is a general template describing how Disposals currently works. It is provided for
          transparency and is not a substitute for legal advice — please have it reviewed by a
          qualified lawyer before relying on it for compliance purposes.
        </p>
      </div>

      <Section title="1. Who we are">
        <p>
          Disposals (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the platform&rdquo;) is an online marketplace that lets
          users post and browse auction-style listings, movers, shop offers, and eateries/foodstuff sellers
          near them, and connect directly by phone or WhatsApp. By creating an account or using the
          platform, you agree to these Terms.
        </p>
      </Section>

      <Section title="2. What Disposals is and isn’t">
        <p>
          Disposals is a facilitation platform: we let sellers, movers, shops and eateries publish listings,
          and let buyers discover and contact them, and in some flows (auction listings) place an order and
          pay through M-Pesa. We are not a party to the underlying sale, service, or food transaction between
          a buyer and a seller/mover/shop/eatery unless explicitly stated. We do not guarantee the quality,
          safety, legality, or accuracy of any listing, and we are not responsible for disputes between users.
        </p>
      </Section>

      <Section title="3. Accounts">
        <p>
          You sign in with a Google account. You are responsible for keeping your account secure and for
          all activity under it. You must provide accurate contact details (including your phone number)
          so buyers, sellers, and service providers can reach you.
        </p>
      </Section>

      <Section title="4. Posting listings">
        <p>
          When you post an auction listing, a mover, an offer, or an eatery, you confirm that you have the
          right to sell or advertise what you’re posting, that the information (including price, location,
          and photos) is accurate, and that it doesn’t violate any law or third party’s rights. We may
          remove, hide, or moderate any listing that violates these Terms, is fraudulent, or is reported by
          other users, and admins may change a listing’s status (for example marking it sold, pending, or
          removed).
        </p>
        <p>
          Prohibited listings include, without limitation: illegal goods or services, stolen property,
          counterfeit items, weapons, hazardous materials, and anything misrepresenting what is actually
          being offered.
        </p>
      </Section>

      <Section title="5. Fees and payments">
        <p>
          Some actions on Disposals carry a fee, shown to you before you pay: a posting fee for auction
          listings, per-day pricing for boosting a listing with an advertisement, and a one-time fee for the
          optional &ldquo;blue star&rdquo; visibility badge on an offer, mover, or eatery listing (which lifts
          that listing’s free 500m visibility radius so it’s discoverable at any distance). All payments are
          processed through Safaricom’s M-Pesa STK Push. We do not receive or store your M-Pesa PIN or full
          payment card details.
        </p>
        <p>
          Fees paid for posting, boosting, or badging a listing are for the service of publishing/promoting
          that listing and are non-refundable once the listing is live or the badge is active, except where
          required by law or where we determine in good faith that a technical error on our side prevented
          the paid-for outcome (for example, a payment that succeeded but the listing never activated).
        </p>
        <p>
          For auction listings bought through the platform, the order amount is paid to complete that
          specific purchase; cancellation is only possible before payment is confirmed, through the order
          management flow provided in the app.
        </p>
      </Section>

      <Section title="6. Advertisements">
        <p>
          Advertisement boosts are reviewed by an admin before going live. We may reject an advertisement
          (for example, if the video doesn’t play or the content is inappropriate) without affecting your
          ability to edit and resubmit it using the same payment.
        </p>
      </Section>

      <Section title="7. Location">
        <p>
          Posting a listing or searching nearby requires sharing a location (either by using your device’s
          location or entering an address/coordinates manually). This location is stored and used to show
          your listing to, or find listings for, nearby users, and to enforce the free-tier 500m visibility
          radius described above.
        </p>
      </Section>

      <Section title="8. Acceptable use">
        <p>
          You agree not to misuse the platform: no harassment of other users, no scraping or automated
          bulk-posting, no attempting to bypass fees or moderation, and no impersonating another person or
          business.
        </p>
      </Section>

      <Section title="9. Liability">
        <p>
          Disposals is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, we are not liable
          for losses arising from transactions between users, inaccurate listings, service interruptions, or
          third-party services we rely on (M-Pesa/Safaricom, Google sign-in, Cloudinary image hosting, and
          our email provider).
        </p>
      </Section>

      <Section title="10. Changes and termination">
        <p>
          We may update these Terms from time to time; continued use of the platform after a change means
          you accept the updated Terms. We may suspend or remove an account or listing that violates these
          Terms.
        </p>
      </Section>

      <Section title="11. Governing law">
        <p>These Terms are governed by the laws of Kenya.</p>
      </Section>

      <Section title="12. Contact">
        <p>Questions about these Terms can be sent through the contact details available in your account settings.</p>
      </Section>
    </main>
  );
}
