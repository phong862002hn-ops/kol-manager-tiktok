import { CampaignOverview } from "./_components/CampaignOverview";

export default function Page({ params }: { params: { id: string } }) {
  return <CampaignOverview campaignId={params.id} />;
}
