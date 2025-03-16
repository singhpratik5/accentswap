import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  IconButton,
  TextField,
  Divider
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import SendIcon from '@mui/icons-material/Send';
import FeedbackForm from './FeedbackForm';

// Socket.io connection
const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

const EnhancedVideoChat = () => {
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, waiting, connecting, connected
  const [error, setError] = useState('');
  const [matchInfo, setMatchInfo] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [waitingTime, setWaitingTime] = useState(0);
  const waitingTimerRef = useRef(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [callEndedMatchInfo, setCallEndedMatchInfo] = useState(null);
  const peerConnectionRef = useRef(null); // Add a ref to store the peer connection

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Initialize WebRTC
  useEffect(() => {
    let peer = null;
    let stream = null;
    
    // Setup media stream
    const setupMediaStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
        
        // Only add tracks if peer connection is still valid
        if (peer && peer.connectionState !== 'closed') {
          stream.getTracks().forEach(track => {
            try {
              peer.addTrack(track, stream);
            } catch (err) {
              console.error('Error adding track to peer connection:', err);
            }
          });
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setError('Could not access camera or microphone. Please check your device permissions.');
      }
    };

    const initializePeerConnection = () => {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      peer = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peer; // Store in ref for access outside useEffect
      setPeerConnection(peer);

      // WebRTC event handlers
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('candidate', { candidate: event.candidate, matchId: matchInfo?.matchId });
        }
      };

      peer.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peer.iceConnectionState);
        if (peer.iceConnectionState === 'disconnected' || 
            peer.iceConnectionState === 'failed' || 
            peer.iceConnectionState === 'closed') {
          handleCallEnd();
        }
      };
      
      // Now that peer is initialized, set up media stream
      setupMediaStream();
    };

    // Initialize peer connection
    initializePeerConnection();

    // Socket.io event handlers
    socket.on('match-found', async (data) => {
      setMatchInfo(data);
      setStatus('connecting');
      
      // Clear waiting timer
      if (waitingTimerRef.current) {
        clearInterval(waitingTimerRef.current);
      }

      // If this user is the initiator, create and send offer
      if (data.initiator === socket.id) {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit('offer', { offer, matchId: data.matchId });
        } catch (error) {
          console.error('Error creating offer:', error);
          setError('Failed to establish connection. Please try again.');
        }
      }
    });

    socket.on('offer', async (data) => {
      if (data.matchId === matchInfo?.matchId) {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('answer', { answer, matchId: data.matchId });
        } catch (error) {
          console.error('Error handling offer:', error);
          setError('Failed to establish connection. Please try again.');
        }
      }
    });

    socket.on('answer', async (data) => {
      if (data.matchId === matchInfo?.matchId) {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
          setStatus('connected');
        } catch (error) {
          console.error('Error handling answer:', error);
          setError('Failed to establish connection. Please try again.');
        }
      }
    });

    socket.on('candidate', async (data) => {
      if (data.matchId === matchInfo?.matchId) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('match-ended', () => {
      handleCallEnd();
    });

    socket.on('chat-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      if (peer) {
        peer.close();
      }
      
      socket.off('match-found');
      socket.off('offer');
      socket.off('answer');
      socket.off('candidate');
      socket.off('match-ended');
      socket.off('chat-message');
      
      // Clear waiting timer
      if (waitingTimerRef.current) {
        clearInterval(waitingTimerRef.current);
      }
      
      // End match if still active
      if (status === 'connected' || status === 'waiting') {
        endMatch();
      }
    };
  }, []);

  // Join waiting pool
  const joinWaitingPool = async () => {
    try {
      setError('');
      setStatus('waiting');
      
      // Start waiting timer
      let seconds = 0;
      waitingTimerRef.current = setInterval(() => {
        seconds += 1;
        setWaitingTime(seconds);
      }, 1000);
      
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': token
        }
      };
      
      // Add user to waiting pool
      await axios.post('/api/matching/waiting-pool', {}, config);
      
      // Register socket with user info
      socket.emit('register-for-matching', { token });
      
      // Start looking for match
      findMatch();
    } catch (error) {
      console.error('Error joining waiting pool:', error);
      setError('Failed to join waiting pool. Please try again.');
      setStatus('idle');
      
      // Clear waiting timer
      if (waitingTimerRef.current) {
        clearInterval(waitingTimerRef.current);
      }
    }
  };

  // Find a match
  const findMatch = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': token
        }
      };
      
      const res = await axios.get('/api/matching/find-match', config);
      
      if (res.data.success) {
        setMatchInfo({
          matchId: res.data.matchId,
          partnerId: res.data.partnerId
        });
        
        // Notify socket about the match
        socket.emit('match-ready', {
          matchId: res.data.matchId,
          partnerId: res.data.partnerId
        });
      } else {
        // If no match found, try again after a delay
        setTimeout(findMatch, 5000);
      }
    } catch (error) {
      console.error('Error finding match:', error);
      // If error, try again after a delay
      setTimeout(findMatch, 5000);
    }
  };

  // End match and return to idle state
  const endMatch = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': token
        }
      };
      
      await axios.post('/api/matching/end-match', {}, config);
      
      if (matchInfo) {
        socket.emit('end-match', { matchId: matchInfo.matchId });
      }
    } catch (error) {
      console.error('Error ending match:', error);
    }
  };

  // Handle call end
  const handleCallEnd = () => {
    // Save match info for feedback form before clearing it
    if (status === 'connected' && matchInfo) {
      setCallEndedMatchInfo(matchInfo);
      setShowFeedback(true);
    }
    
    endMatch();
    setStatus('idle');
    setMatchInfo(null);
    setMessages([]);
    
    // Clear waiting timer
    if (waitingTimerRef.current) {
      clearInterval(waitingTimerRef.current);
      setWaitingTime(0);
    }
  };

  // Handle feedback form close
  const handleFeedbackClose = () => {
    setShowFeedback(false);
    setCallEndedMatchInfo(null);
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
    if (newMessage.trim() && matchInfo) {
      const message = {
        text: newMessage,
        sender: 'me',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, message]);
      socket.emit('chat-message', {
        ...message,
        sender: 'partner', // Will be 'me' for the recipient
        matchId: matchInfo.matchId
      });
      
      setNewMessage('');
    }
  };

  // Format waiting time
  const formatWaitingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          AccentSwap Video Chat
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {status === 'idle' && (
          <Box textAlign="center" sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Ready to practice your language skills?
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              You'll be matched with a partner based on your language preferences and interests.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={joinWaitingPool}
            >
              Find a Conversation Partner
            </Button>
          </Box>
        )}
        
        {status === 'waiting' && (
          <Box textAlign="center" sx={{ my: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Finding you a perfect match...
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Waiting time: {formatWaitingTime(waitingTime)}
            </Typography>
            <Button 
              variant="outlined" 
              color="secondary" 
              sx={{ mt: 2 }}
              onClick={handleCallEnd}
            >
              Cancel
            </Button>
          </Box>
        )}
        
        {(status === 'connecting' || status === 'connected') && (
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
            
            {/* Chat panel */}
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={2} 
                sx={{ 
                  height: '60vh', 
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
            </Grid>
          </Grid>
        )}
        
        {showFeedback && (
          <FeedbackForm 
            matchInfo={callEndedMatchInfo}
            onClose={handleFeedbackClose}
          />
        )}
      </Paper>
    </Container>
  );
};

export default EnhancedVideoChat;