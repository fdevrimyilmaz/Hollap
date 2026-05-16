import { StageRoomClient } from "../../../../components/stage/StageRoomClient";

type Params = {
  params: Promise<{ roomId: string }>;
};

export default async function StageRoomPage({ params }: Params) {
  const { roomId } = await params;
  return <StageRoomClient roomId={roomId} />;
}
