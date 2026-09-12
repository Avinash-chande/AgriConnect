/**
 * AgriConnect WebRTC Audio Peer Connection Service
 * Manages peer-to-peer audio streaming, microphone device permissions,
 * STUN server configuration, mute toggling, and clean resource destruction.
 */

export interface WebRTCCallbacks {
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onTrack?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  /**
   * Check if WebRTC and mediaDevices are supported in the current browser
   */
  public isSupported(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      window.RTCPeerConnection &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Request local microphone audio stream with comprehensive error handling
   */
  public async getLocalAudioStream(): Promise<MediaStream> {
    if (!this.isSupported()) {
      throw new Error(
        'Voice calling is not supported in this browser. Please use a modern browser such as Chrome, Edge, Firefox, or Safari.'
      );
    }

    // Reuse active local stream if tracks are live
    if (this.localStream && this.localStream.getAudioTracks().some((t) => t.readyState === 'live')) {
      return this.localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.localStream = stream;
      this.isMuted = false;
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error(
          'Microphone permission is required to make a voice call. Please allow microphone access in your browser settings.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No microphone found on your device. Please plug in a microphone or headset.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error('Microphone is currently in use by another application.');
      }
      throw new Error(err.message || 'Failed to access microphone.');
    }
  }

  /**
   * Initialize RTCPeerConnection with STUN servers and event bindings
   */
  public createPeerConnection(callbacks: WebRTCCallbacks): RTCPeerConnection {
    if (this.peerConnection) {
      this.closePeerConnection();
    }

    const stunServerUrl =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WEBRTC_STUN_SERVER) ||
      'stun:stun.l.google.com:19302';

    const rtcConfig: RTCConfiguration = {
      iceServers: [
        {
          urls: [stunServerUrl, 'stun:stun1.l.google.com:19302'],
        },
      ],
      iceCandidatePoolSize: 10,
    };

    const pc = new RTCPeerConnection(rtcConfig);
    this.peerConnection = pc;
    this.pendingCandidates = [];

    // Add local audio tracks to peer connection
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callbacks.onIceCandidate(event.candidate);
      }
    };

    // Handle incoming remote audio stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        this.playRemoteAudio(remoteStream);
        if (typeof callbacks.onTrack === 'function') {
          callbacks.onTrack(remoteStream);
        }
      }
    };

    // Handle connection state transitions
    pc.onconnectionstatechange = () => {
      if (typeof callbacks.onConnectionStateChange === 'function') {
        callbacks.onConnectionStateChange(pc.connectionState);
      }
    };

    return pc;
  }

  /**
   * Create SDP Offer (Initiator / Farmer)
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection is not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Set Remote Offer and Create SDP Answer (Receiver / Worker)
   */
  public async handleOfferAndCreateAnswer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection is not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await this.processPendingCandidates();

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Set Remote Answer (Initiator / Farmer)
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection is not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    await this.processPendingCandidates();
  }

  /**
   * Add ICE candidate received from signaling socket
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;

    if (!this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore stale ICE candidates after disconnect
    }
  }

  /**
   * Flush queued candidates once remote description is set
   */
  private async processPendingCandidates(): Promise<void> {
    if (!this.peerConnection) return;
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Ignore failed candidates
        }
      }
    }
  }

  /**
   * Attach remote audio stream to a hidden HTML5 <audio> element
   */
  private playRemoteAudio(stream: MediaStream): void {
    try {
      if (!this.remoteAudioElement && typeof document !== 'undefined') {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.style.display = 'none';
        audio.id = 'agri-remote-audio-player';
        document.body.appendChild(audio);
        this.remoteAudioElement = audio;
      }

      if (this.remoteAudioElement) {
        this.remoteAudioElement.srcObject = stream;
        this.remoteAudioElement.play().catch(() => {
          // Handled if user hasn't interacted with DOM yet
        });
      }
    } catch (e) {
      console.warn('[WebRTCService] Error setting remote audio playback:', e);
    }
  }

  /**
   * Toggle local microphone mute state
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  /**
   * Get current mute state
   */
  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Close and cleanup RTCPeerConnection
   */
  private closePeerConnection(): void {
    if (this.peerConnection) {
      try {
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }
    this.pendingCandidates = [];
  }

  /**
   * Complete teardown of all media streams, peer connections, and audio elements
   */
  public cleanup(): void {
    // 1. Stop all local microphone tracks
    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {}
      this.localStream = null;
    }

    // 2. Close WebRTC PeerConnection
    this.closePeerConnection();

    // 3. Cleanup remote audio element
    if (this.remoteAudioElement) {
      try {
        this.remoteAudioElement.srcObject = null;
        this.remoteAudioElement.remove();
      } catch {}
      this.remoteAudioElement = null;
    }

    this.isMuted = false;
  }
}

export const webrtcService = new WebRTCService();
