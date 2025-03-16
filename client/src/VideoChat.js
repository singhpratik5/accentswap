import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

// Use dynamic hostname to work across different environments
const socket = io(`http://${window.location.hostname}:5000`); // Dynamically use current hostname

const VideoChat = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [peerConnection, setPeerConnection] = useState(null);

    useEffect(() => {
        const configuration = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        };

        const peer = new RTCPeerConnection(configuration);
        setPeerConnection(peer);

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localVideoRef.current.srcObject = stream;
                stream.getTracks().forEach(track => peer.addTrack(track, stream));
            })
            .catch(error => console.error("Error accessing media devices:", error));

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE Candidate:", event.candidate);
                socket.emit('candidate', event.candidate);
            }
        };

        peer.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        socket.on('offer', async (offer) => {
            console.log("Received Offer:", offer);
            await peer.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            console.log("Sending Answer:", answer);
            socket.emit('answer', answer);
        });

        socket.on('answer', async (answer) => {
            console.log("Received Answer:", answer);
            if (peer) {
                await peer.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        socket.on('candidate', async (candidate) => {
            console.log("Received ICE Candidate:", candidate);
            if (peer) {
                await peer.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

    }, []);

    const startCall = async () => {
        if (!peerConnection) return;

        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            console.log("Sending Offer:", offer);
            socket.emit('offer', offer);
        } catch (error) {
            console.error("Error starting call:", error);
        }
    };

    return (
        <div className="video-chat">
            <h2>Video Chat</h2>
            <video ref={localVideoRef} autoPlay playsInline className="video-box" />
            <video ref={remoteVideoRef} autoPlay playsInline className="video-box" />
            <button onClick={startCall}>Start Call</button>
        </div>
    );
};

export default VideoChat;
