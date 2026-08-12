/**
 * Build credit, for anyone who opens the console.
 *
 * Deliberately not rendered anywhere on the page — the site belongs to the lab,
 * not to whoever built it. This is the quiet version: developers and recruiters
 * inspecting the site will find it, ordinary visitors never will.
 *
 * The address is assembled at runtime rather than sitting in the bundle as a
 * literal, so the usual scrapers that regex built JS for mail addresses come up
 * empty.
 */
const AUTHOR = "Akash Kolla";
const CONTACT = ["akashkolla194", "gmail.com"].join("@");

export default function printSignature() {
  if (typeof console === "undefined" || !console.log) return;

  const heading = "color:#B95438;font:600 13px ui-monospace,monospace;letter-spacing:.18em";
  const body = "color:#4A5A52;font:400 12px ui-monospace,monospace";
  const accent = "color:#1C2722;font:600 12px ui-monospace,monospace";

  console.log(
    "%cINNOVATIVE WASTE MANAGEMENT LAB\n" +
      `%cDesign & build — ${AUTHOR}\n` +
      "Like this site and want one of your own? Get in touch:\n" +
      `%c${CONTACT}`,
    heading,
    body,
    accent
  );
}
