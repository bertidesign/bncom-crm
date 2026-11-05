import { Workspace } from "@/components/workspace";
export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <Workspace clientId={id}/>; }
