import { io } from "socket.io-client";

const socket = io(`http://${window.location.hostname}:5000`); // Dynamically use current hostname

let localStream;
let peerConnection;

const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export const startCall = async (remoteVideoRef) => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) socket.emit("candidate", event.candidate);
    };

    peerConnection.ontrack = (event) => {
        remoteVideoRef.current.srcObject = event.streams[0];
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
};

socket.on("offer", async (offer) => {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
});

socket.on("answer", (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
