import { HistoryDetailClient } from "@/components/HistoryDetailClient";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HistoryDetailClient id={decodeURIComponent(id)} />;
}
