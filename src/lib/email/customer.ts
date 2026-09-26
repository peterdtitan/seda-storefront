import "server-only";

import { formatNaira } from "@/lib/money";

import { itemsTable, shell } from "./layout";
import { sendEmail, type Sent } from "./send";

export type EmailKind = "order_confirmation" | "out_for_delivery" | "delivered";

export type CustomerOrder = {
  reference: string;
  name: string;
  email: string;
  totalKobo: number;
  address: string | null;
  city: string | null;
  items: { productName: string; colourName: string; size: string; quantity: number }[];
};

const CONTACT = "wearsedastudio@gmail.com";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function plain(html: string) {
  return html
    .replace(/<li[^>]*>/g, "- ")
    .replace(/<\/li>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function build(kind: EmailKind, order: CustomerOrder) {
  const who = firstName(order.name);
  const where = [order.address, order.city].filter(Boolean).join(", ");

  if (kind === "order_confirmation") {
    const body =
      `<p style="margin:0 0 12px;">Thank you, ${who}. We have your order and we are getting it ready.</p>` +
      itemsTable(order.items) +
      `<p style="margin:12px 0 0;"><strong>Total paid: ${formatNaira(order.totalKobo)}</strong></p>` +
      (where ? `<p style="margin:12px 0 0;">Delivering to ${where}.</p>` : "");

    return {
      subject: `We have your order · ${order.reference}`,
      html: shell({
        heading: "We have your order",
        body,
        footnote: `Your reference is ${order.reference}. Reply to this email or write to ${CONTACT} if anything is wrong.`,
      }),
    };
  }

  if (kind === "out_for_delivery") {
    const body =
      `<p style="margin:0 0 12px;">Good news, ${who} — your order is with a courier today.</p>` +
      itemsTable(order.items) +
      (where ? `<p style="margin:12px 0 0;">On its way to ${where}.</p>` : "");

    return {
      subject: `On its way today · ${order.reference}`,
      html: shell({
        heading: "On its way today",
        body,
        footnote: `Reference ${order.reference}. If nobody will be there, reply and we will rearrange.`,
      }),
    };
  }

  return {
    subject: `Delivered · ${order.reference}`,
    html: shell({
      heading: "Delivered",
      body:
        `<p style="margin:0 0 12px;">Your order has been delivered, ${who}. We hope it is everything you wanted.</p>` +
        itemsTable(order.items) +
        `<p style="margin:12px 0 0;">Adire is hand-dyed, so wash it cold and separately the first time.</p>`,
      footnote: `Reference ${order.reference}. Anything not right? Write to ${CONTACT} and we will sort it.`,
    }),
  };
}

export async function sendCustomerEmail(kind: EmailKind, order: CustomerOrder): Promise<Sent> {
  const { subject, html } = build(kind, order);
  return sendEmail({ to: order.email, subject, html, text: plain(html) });
}
