# accentswap
AccentSwap is a real-time voice and video calling platform that connects users with random strangers to practice and improve any language through live conversations. The platform fosters peer-to-peer learning, helping users enhance their fluency, pronunciation, and confidence in a natural, interactive way.

AccentSwap - Feature Documentation

Overview

AccentSwap is a real-time voice and video calling platform that connects users with random strangers to practice and improve any language through live conversations. The platform fosters peer-to-peer learning, helping users enhance their fluency, pronunciation, and confidence in a natural, interactive way.

Core Features

1. User Authentication & Profile Management

User Registration: Users can register using their name, email, and password.

User Login: JWT-based authentication for secure access.

Profile Management: Users can update preferences, including:

Preferred language

Age range

Interests

Authentication Middleware: Protects private routes.

2. Matching System

Real-time Matching: Matches users based on:

Preferred language

Age range

Interests

Availability (only match with online users)

Optimized Database Queries: Ensures fast and efficient matching.

3. Real-Time Communication

WebSockets for Messaging: Enables instant text communication.

WebRTC for Voice & Video Calls: Facilitates seamless real-time conversations.

Connection Handling: Manages user connections, disconnections, and re-connections.

4. Chat & Call System

Text Chat: Integrated chat system alongside video calls.

Voice & Video Calling: Peer-to-peer (P2P) WebRTC-based real-time communication.

Call Notifications: Notify users when a match is found.

5. Database & Backend

MongoDB as Database: Stores user profiles, preferences, and chat history.

Node.js & Express Backend: Handles API requests and WebSocket connections.

Scalable Matching Algorithm: Ensures efficient and effective user pairings.

6. Security & Performance

JWT Authentication: Secure user sessions.

Environment Variables: Secure credentials using .env.

Rate Limiting & Input Validation: Prevents abuse and ensures data integrity.

Efficient WebRTC & WebSocket Management: Reduces server load.

System Architecture

Tech Stack

Frontend: React (if needed for UI integration)

Backend: Node.js with Express

Database: MongoDB (Mongoose ORM)

Real-time Communication: WebSockets + WebRTC

Authentication: JWT (JSON Web Tokens)

Hosting & Deployment: TBD (e.g., AWS, Azure, DigitalOcean, or Heroku)

Next Steps

Implement a robust matching system.

Integrate WebRTC for real-time communication.

Enhance authentication and profile management.

Optimize WebSocket messaging.

Implement a simple frontend UI (if required).

Ensure security & performance enhancements.

//----------------------------------------------------


✅ Limits users to 5 email attempts per hour per IP
✅ If a user changes email but keeps the same IP, they still get blocked
✅ Automatically removes expired attempts (older than 1 hour)


===============================================================

