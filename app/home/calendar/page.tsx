import Schedule from "@/components/ui/calendar";

export default function CalendarPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Planification de rendez-vous</h1>
      <Schedule />
    </div>
  );
}