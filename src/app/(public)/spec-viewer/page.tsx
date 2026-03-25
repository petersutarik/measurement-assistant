import { SpecViewer, type Spec } from "./spec-viewer";
import exampleSpec from "../../../../.measurement/examples/acme-ecommerce.json";

export const metadata = {
  title: "Spec Viewer — Measurement Assistant",
};

export default function SpecViewerPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SpecViewer spec={exampleSpec as unknown as Spec} />
    </div>
  );
}
