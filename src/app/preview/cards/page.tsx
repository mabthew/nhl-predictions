// Public mirror of /admin/preview — kept for the working notes session.
// Re-exports the same content with a standalone full-height wrapper (no admin chrome).

import PreviewCards from "../../admin/preview/page";

export default function Page() {
  return (
    <main className="min-h-screen bg-light-gray py-12">
      <div className="max-w-5xl mx-auto px-6">
        <PreviewCards />
      </div>
    </main>
  );
}
