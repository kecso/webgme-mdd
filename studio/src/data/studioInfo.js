/**
 * About dialog copy and the optional documentation link.
 * Set VITE_DOCS_URL when building the studio to point Documentation elsewhere.
 */

const REPO = 'https://github.com/kecso/webgme-mdd/blob/main';

export const MERMAID_URL = 'https://mermaid.js.org/';

export const STUDIO_DOCS_URL =
  import.meta.env.VITE_DOCS_URL || `${REPO}/docs/usage/projects-and-domains.md`;

export const DRIVING_STORIES = [
  {
    id: 'S1',
    title: 'Automotive AEB / CACC++ safety stack',
    href: `${REPO}/docs/stories/S1-automotive-aeb-cacc.md`
  },
  {
    id: 'S2',
    title: 'Aircraft fuel and radar, several views of one design',
    href: `${REPO}/docs/stories/S2-aircraft-rflp-fuel-radar.md`
  },
  {
    id: 'S3',
    title: 'IEC 61850 substation protection',
    href: `${REPO}/docs/stories/S3-iec61850-substation.md`
  },
  {
    id: 'S4',
    title: 'Event-driven ticketing platform',
    href: `${REPO}/docs/stories/S4-event-driven-ticketing.md`
  },
  {
    id: 'S5',
    title: 'Regulated infusion device',
    href: `${REPO}/docs/stories/S5-medical-infusion-device.md`
  }
];
