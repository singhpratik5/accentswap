import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  TextField,
  Grid,
  Alert,
  IconButton,
  Divider,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoIcon from '@mui/icons-material/Info';
import FeedbackForm from './FeedbackForm';

// Create a socket connection
let socket;

const TestingMode = () => {
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, waiting, connecting, connected
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState('http://localhost:5000');
  const [roomId, setRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [useStun, setUseStun] = useState(true);
  const [networkStats, setNetworkStats] = useState(null);
  const statsIntervalRef = useRef(null);
  const [matchInfo, setMatchInfo] = useState(null);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Initialize socket connection when server URL changes
  useEffect(() => {
    if (socket) {
      socket.disconnect();
    }
    
    socket = io(serverUrl);
    
    // Socket connection event handlers
    socket.on('connect', () => {
      console.log('Connected to signaling server');
      setError('');
    });
    
    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError(`Failed to connect to server: ${err.message}`);
    });
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [serverUrl]);

  // Initialize WebRTC when status changes to connecting
  useEffect(() => {
    if (status !== 'connecting' && status !== 'connected') return;
    
    // Configure ICE servers based on user preference
    const configuration = useStun ? {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    } : {
      iceServers: [] // No STUN servers for local network testing
    };

    const peer = new RTCPeerConnection(configuration);
    setPeerConnection(peer);

    // Setup media stream
    const setupMediaStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setError('Could not access camera or microphone. Please check your device permissions.');
      }
    };

    setupMediaStream();

    // WebRTC event handlers
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', { candidate: event.candidate, roomId });
        // Log ICE candidate for debugging
        console.log('ICE candidate:', event.candidate);
        setConnectionInfo(prev => ({
          ...prev,
          iceCandidates: [...(prev.iceCandidates || []), event.candidate]
        }));
      }
    };

    peer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peer.iceConnectionState);
      setConnectionInfo(prev => ({
        ...prev,
        iceConnectionState: peer.iceConnectionState
      }));
      
      if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed') {
        setStatus('connected');
        // Start collecting stats
        startCollectingStats(peer);
      } else if (peer.iceConnectionState === 'disconnected' || 
                peer.iceConnectionState === 'failed' || 
                peer.iceConnectionState === 'closed') {
        handleCallEnd();
      }
    };

    // Socket.io event handlers for WebRTC signaling
    socket.on('room-created', (data) => {
      setRoomId(data.roomId);
      setIsHost(true);
      setMatchInfo({
        matchId: data.roomId,
        partnerId: 'test-partner'
      });
    });

    socket.on('room-joined', (data) => {
      setRoomId(data.roomId);
      setIsHost(false);
      setMatchInfo({
        matchId: data.roomId,
        partnerId: 'test-partner'
      });
      
      // If joining, create and send offer
      createAndSendOffer(peer);
    });

    socket.on('offer', async (data) => {
      if (data.roomId === roomId) {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('answer', { answer, roomId });
          
          // Log offer for debugging
          setConnectionInfo(prev => ({
            ...prev,
            remoteDescription: data.offer
          }));
        } catch (error) {
          console.error('Error handling offer:', error);
          setError('Failed to establish connection. Please try again.');
        }
      }
    });

    socket.on('answer', async (data) => {
      if (data.roomId === roomId) {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
          
          // Log answer for debugging
          setConnectionInfo(prev => ({
            ...prev,
            remoteDescription: data.answer
          }));
        } catch (error) {
          console.error('Error handling answer:', error);
          setError('Failed to establish connection. Please try again.');
        }
      }
    });

    socket.on('candidate', async (data) => {
      if (data.roomId === roomId) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('user-disconnected', () => {
      handleCallEnd();
    });

    socket.on('chat-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Cleanup function
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      peer.close();
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('candidate');
      socket.off('user-disconnected');
      socket.off('chat-message');
      
      // Stop collecting stats
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [status, roomId, useStun]);

  // Create and send offer
  const createAndSendOffer = async (peer) => {
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit('offer', { offer, roomId });
      
      // Log offer for debugging
      setConnectionInfo(prev => ({
        ...prev,
        localDescription: offer
      }));
    } catch (error) {
      console.error('Error creating offer:', error);
      setError('Failed to create connection offer. Please try again.');
    }
  };

  // Start collecting WebRTC stats
  const startCollectingStats = (peer) => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    
    statsIntervalRef.current = setInterval(async () => {
      try {
        const stats = await peer.getStats();
        const statsObj = {};
        
        stats.forEach(report => {
          if (report.type === 'transport') {
            statsObj.transport = {
              bytesReceived: report.bytesReceived,
              bytesSent: report.bytesSent,
              packetsReceived: report.packetsReceived,
              packetsSent: report.packetsSent
            };
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            statsObj.candidatePair = {
              localType: report.localCandidateType,
              remoteType: report.remoteCandidateType,
              rtt: report.currentRoundTripTime,
              availableOutgoingBitrate: report.availableOutgoingBitrate
            };
          }
        });
        
        setNetworkStats(statsObj);
      } catch (error) {
        console.error('Error getting stats:', error);
      }
    }, 2000);
  };

  // Create a new room
  const createRoom = () => {
    setError('');
    setStatus('connecting');
    socket.emit('create-room');
  };

  // Join an existing room
  const joinRoom = () => {
    if (!joinRoomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    setError('');
    setStatus('connecting');
    setRoomId(joinRoomId);
    socket.emit('join-room', { roomId: joinRoomId });
  };

  // End call and return to idle state
  const handleCallEnd = () => {
    // Save match info for feedback form before clearing it
    if (status === 'connected' && matchInfo) {
      setShowFeedback(true);
    }
    
    // Notify server about disconnection
    if (roomId) {
      socket.emit('leave-room', { roomId });
    }
    
    setStatus('idle');
    setRoomId('');
    setMessages([]);
    setConnectionInfo({});
    setNetworkStats(null);
    
    // Stop collecting stats
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
  };

  // Handle feedback form close
  const handleFeedbackClose = () => {
    setShowFeedback(false);
    setMatchInfo(null);
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  // Send chat message
  const sendMessage = () => {
    if (newMessage.trim() && roomId) {
      const message = {
        text: newMessage,
        sender: 'me',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, message]);
      socket.emit('chat-message', {
        ...message,
        sender: 'partner', // Will be 'me' for the recipient
        roomId
      });
      
      setNewMessage('');
    }
  };

  // Copy room ID to clipboard
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          AccentSwap Testing Mode
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {status === 'idle' && (
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Local Network Testing
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              Test your connection with devices on the same network. Create a room on one device and join it from another.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Create a Room</Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Create a new room and share the room ID with another device to connect.
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={useStun} 
                        onChange={(e) => setUseStun(e.target.checked)}
                      />
                    }
                    label="Use STUN servers (recommended for different networks)"
                  />
                  
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      fullWidth
                      onClick={createRoom}
                    >
                      Create Room
                    </Button>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Join a Room</Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Enter a room ID to join an existing room.
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Room ID"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    margin="normal"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={useStun} 
                        onChange={(e) => setUseStun(e.target.checked)}
                      />
                    }
                    label="Use STUN servers (recommended for different networks)"
                  />
                  
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      variant="contained" 
                      color="secondary" 
                      fullWidth
                      onClick={joinRoom}
                      disabled={!joinRoomId.trim()}
                    >
                      Join Room
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {(status === 'connecting' || status === 'connected') && (
          <Box>
            {/* Room information */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1">
                  Room ID: {roomId}
                  <IconButton size="small" onClick={copyRoomId} title="Copy Room ID">
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Status: {status === 'connected' ? 'Connected' : 'Connecting...'}
                </Typography>
              </Box>
              <Chip 
                label={isHost ? 'Host' : 'Guest'} 
                color={isHost ? 'primary' : 'secondary'} 
                variant="outlined" 
              />
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Box sx={{ position: 'relative', width: '100%', height: '60vh' }}>
                  {/* Remote video (large) */}
                  <Box 
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      bgcolor: 'black',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <video 
                      ref={remoteVideoRef} 
                      autoPlay 
                      playsInline 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {status === 'connecting' && (
                      <Box 
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)'
                        }}
                      >
                        <CircularProgress color="primary" />
                        <Typography color="white" sx={{ ml: 2 }}>
                          Connecting...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {/* Local video (small overlay) */}
                  <Box 
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      width: '25%',
                      height: '25%',
                      bgcolor: 'black',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '2px solid white'
                    }}
                  >
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                  
                  {/* Call controls */}
                  <Box 
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      p: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    <IconButton 
                      onClick={toggleAudio} 
                      sx={{ mx: 1, bgcolor: 'white' }}
                      color={audioEnabled ? 'primary' : 'error'}
                    >
                      {audioEnabled ? <MicIcon /> : <MicOffIcon />}
                    </IconButton>
                    
                    <IconButton 
                      onClick={toggleVideo} 
                      sx={{ mx: 1, bgcolor: 'white' }}
                      color={videoEnabled ? 'primary' : 'error'}
                    >
                      {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                    </IconButton>
                    
                    <IconButton 
                      onClick={handleCallEnd} 
                      sx={{ mx: 1, bgcolor: 'error.main' }}
                      color="inherit"
                    >
                      <CallEndIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
                  {/* Connection info panel */}
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      mb: 2, 
                      p: 2, 
                      height: '30%', 
                      overflow: 'auto',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Connection Info
                      <IconButton size="small" color="primary" title="Connection information for debugging">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Typography>
                    
                    <Typography variant="body2">
                      <strong>ICE State:</strong> {connectionInfo.iceConnectionState || 'Initializing'}
                    </Typography>
                    
                    {networkStats && networkStats.transport && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Data Sent:</strong> {formatBytes(networkStats.transport.bytesSent)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Data Received:</strong> {formatBytes(networkStats.transport.bytesReceived)}
                        </Typography>
                      </Box>
                    )}
                    
                    {networkStats && networkStats.candidatePair && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Connection Type:</strong> {networkStats.candidatePair.localType} → {networkStats.candidatePair.remoteType}
                        </Typography>
                        {networkStats.candidatePair.rtt && (
                          <Typography variant="body2">
                            <strong>Round Trip Time:</strong> {(networkStats.candidatePair.rtt * 1000).toFixed(2)} ms
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Paper>
                  
                  {/* Chat panel */}
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      flexGrow: 1,
                      display: 'flex', 
                      flexDirection: 'column',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                      <Typography variant="h6">Chat</Typography>
                    </Box>
                    
                    <Box 
                      sx={{ 
                        flexGrow: 1, 
                        p: 2, 
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                      }}
                    >
                      {messages.length === 0 ? (
                        <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
                          No messages yet. Start the conversation!
                        </Typography>
                      ) : (
                        messages.map((msg, index) => (
                          <Box 
                            key={index}
                            sx={{
                              alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                              bgcolor: msg.sender === 'me' ? 'primary.light' : 'grey.200',
                              color: msg.sender === 'me' ? 'white' : 'text.primary',
                              p: 1.5,
                              borderRadius: 2,
                              maxWidth: '80%'
                            }}
                          >
                            <Typography variant="body2">{msg.text}</Typography>
                          </Box>
                        ))
                      )}
                    </Box>
                    
                    <Divider />
                    
                    <Box sx={{ p: 2, display: 'flex' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <IconButton 
                        color="primary" 
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        sx={{ ml: 1 }}
                      >
                        <SendIcon />
                      </IconButton>
                    </Box>
                  </Paper>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
      
      {/* Feedback form dialog */}
      <FeedbackForm 
        open={showFeedback} 
        onClose={handleFeedbackClose} 
        matchInfo={matchInfo}
      />
    </Container>
  );
};

export default TestingMode;