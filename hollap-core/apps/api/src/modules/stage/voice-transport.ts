export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export interface VoiceTransportProvider {
  getTransportConfig(roomId: string): Promise<{ iceServers: IceServer[] }>;
}

class WebRtcP2PTransportProvider implements VoiceTransportProvider {
  async getTransportConfig(_roomId: string) {
    return {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
  }
}

export const voiceTransportProvider: VoiceTransportProvider =
  new WebRtcP2PTransportProvider();
