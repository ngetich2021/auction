import "server-only";
import { normalizeKenyanPhone } from "@/lib/phone";

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

export class MpesaError extends Error {}

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(`${BASE_URL}/oauth/v2/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new MpesaError("Could not authenticate with M-Pesa. Please try again shortly.");
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function buildPassword(timestamp: string) {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

function buildTimestamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export type StkPushResult = {
  merchantRequestId: string;
  checkoutRequestId: string;
};

export async function initiateStkPush(params: {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<StkPushResult> {
  const phone = normalizeKenyanPhone(params.phone);
  if (!phone) {
    throw new MpesaError("Enter a valid Safaricom number, e.g. 0712345678.");
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new MpesaError("Enter a valid payment amount.");
  }

  const accessToken = await getAccessToken();
  const timestamp = buildTimestamp();
  const shortcode = process.env.MPESA_SHORTCODE!;
  // This account is a Buy Goods till, not a paybill: the STK password/auth still uses the
  // organization shortcode, but the funds destination (PartyB) is the till number itself.
  // Sending CustomerPayBillOnline with PartyB=shortcode here is why Safaricom accepts the
  // request (ResponseCode 0) but never actually pushes it to the customer's phone.
  const tillNumber = process.env.MPESA_TILL_NUMBER;
  const callbackBase = process.env.MPESA_CALLBACK_URL;
  if (!tillNumber || !callbackBase) {
    throw new MpesaError("M-Pesa is not configured correctly. Please contact support.");
  }

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: buildPassword(timestamp),
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: Math.round(params.amount),
      PartyA: phone,
      PartyB: tillNumber,
      PhoneNumber: phone,
      CallBackURL: `${callbackBase.replace(/\/$/, "")}/api/mpesa/callback`,
      AccountReference: params.accountReference.slice(0, 12),
      TransactionDesc: params.transactionDesc.slice(0, 13),
    }),
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok || data.ResponseCode !== "0") {
    throw new MpesaError(
      data.errorMessage || data.CustomerMessage || "M-Pesa payment request was rejected. Check the phone number and try again."
    );
  }

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
  };
}

export type StkQueryResult =
  | { outcome: "pending" }
  | { outcome: "succeeded" }
  | { outcome: "failed"; resultDesc: string };

// Our own /api/mpesa/callback webhook is a passive listener — if Safaricom's callback never
// reaches it (unreachable CallBackURL, transient network failure, etc.) a real, successfully
// deducted payment can sit stuck on PENDING forever with nothing to correct it. This actively
// asks Safaricom for the authoritative status of a checkout, so the frontend's status poll can
// self-heal even when the webhook never fires.
export async function queryStkPushStatus(checkoutRequestId: string): Promise<StkQueryResult> {
  try {
    const accessToken = await getAccessToken();
    const timestamp = buildTimestamp();
    const shortcode = process.env.MPESA_SHORTCODE!;

    const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: buildPassword(timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
      cache: "no-store",
    });

    const data = await res.json();

    // Safaricom returns a non-2xx with this error code while the transaction is still being
    // processed on the customer's phone — not a failure, just "ask again later".
    if (!res.ok) {
      if (data?.errorCode === "500.001.1001") return { outcome: "pending" };
      return { outcome: "pending" };
    }

    const resultCode = Number(data.ResultCode);
    if (resultCode === 0) return { outcome: "succeeded" };
    if (Number.isFinite(resultCode)) {
      return { outcome: "failed", resultDesc: data.ResultDesc || "Payment was not completed." };
    }
    return { outcome: "pending" };
  } catch {
    // Network hiccup querying Safaricom — stay pending and let the next poll tick retry rather
    // than risk marking a possibly-successful payment as failed.
    return { outcome: "pending" };
  }
}
