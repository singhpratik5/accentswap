import React, { useRef, useEffect } from 'react';

const VideoChat = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const ws = useRef(null);

  // Add these functions inside the VideoChat component

  const toggleAudio = () => {
    const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
  };

  const toggleVideo = () => {
    const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
  };

  const endCall = () => {
    peerConnection.current.close();
    ws.current.close();
  };

  useEffect(() => {
    const constraints = { video: true, audio: true };

    // Establish WebSocket connection
    ws.current = new WebSocket('ws://localhost:5000');

    ws.current.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.current.onmessage = (message) => {
      const data = JSON.parse(message.data);

      if (data.sdp) {
        peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
          .then(() => {
            if (data.sdp.type === 'offer') {
              peerConnection.current.createAnswer()
                .then(answer => peerConnection.current.setLocalDescription(answer))
                .then(() => {
                  sendMessage({ sdp: peerConnection.current.localDescription });
                });
            }
          });
      } else if (data.candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        localVideoRef.current.srcObject = stream;

        // Create a new RTCPeerConnection with STUN servers
        peerConnection.current = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        // Add local stream to the connection
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.current.ontrack = (event) => {
          remoteVideoRef.current.srcObject = event.streams[0];
        };

        // Handle ICE candidates
        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            sendMessage({ candidate: event.candidate });
          }
        };

        // Create an offer
        peerConnection.current.createOffer()
          .then(offer => peerConnection.current.setLocalDescription(offer))
          .then(() => {
            sendMessage({ sdp: peerConnection.current.localDescription });
          });
      })
      .catch((error) => {
        console.error('Error accessing media devices.', error);
      });

    return () => {
      ws.current.close();
    };
  }, []);

  // Function to send messages over WebSocket
  const sendMessage = (message) => {
    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open');
    }
  };

  return (
    <div>
      <video ref={localVideoRef} autoPlay playsInline muted />
      <video ref={remoteVideoRef} autoPlay playsInline />
      <div>
        <button onClick={toggleAudio}>Mute/Unmute</button>
        <button onClick={toggleVideo}>Start/Stop Video</button>
        <button onClick={endCall}>End Call</button>
      </div>
    </div>
  );
};

export default VideoChat;