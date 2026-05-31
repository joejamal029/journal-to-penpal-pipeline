import { SourcesModal } from "@/components/journal/SourcesModal";
import { PenpalFormModal } from "@/components/penpal/PenpalFormModal";
import { CorrespondenceModal } from "@/components/penpal/CorrespondenceModal";
import { ScaffoldModal } from "@/components/scaffold/ScaffoldModal";

export function Modals() {
  return (
    <>
      <SourcesModal />
      <PenpalFormModal />
      <CorrespondenceModal />
      <ScaffoldModal />
    </>
  );
}
