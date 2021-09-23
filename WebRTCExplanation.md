# WebRTC Video Call Application

### Brief

WebRTC exists to allow peers to connect to each other directly and send data between them without needing to send the data through a server. That being said, a "signalling server" is still required in order for the two peers to setup the connection.

### The Connection Process

#### The Signalling Server 

To begin the process, each peer will connect to a "signalling server" (in this example a WebSocketServer on https). This server will simply broadcast any messages sent to it to all clients connected, including the sender. When peer 1 connects, peer 1 sends a message to the server which reaches no one else since it's the only one connected. When peer 2 connects, peer 2 sends a message which is received by peer 1 who can then create a RTCPeerConnection object and begin collecting ICE candidates. Upon receiving this message, peer 1 also sends a message back to the other peer so that they can begin the same process too.

![Signalling Server](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210829224536724.png)

#### Identifying ICE Candidates

Before one peer can connect to another and vice versa, they must identify the IP address(s) through which they can be accessed. This may include it's private IP address within a local network, which could be accessed by other devices in the same local network; or a public IP address, which could be accessed by the Internet.

Each of these IP address' are referred to as ICE candidates. When a RTCPeerConnection object is created, it immediately begins to search for ICE candidates. To assist with this, the developer may provide the URL's of various STUN servers as an argument to the RTCPeerConnection object. These STUN servers are queried by the peer to identify any external (public) IP address' of the peer which can then be added to the peer's collection of ICE candidates.

![image-20210830121304169](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210830121304169.png)

#### Session Description Protocol (SDP)

Once each of the peers have their own collections of ICE candidates, they should be ready to setup their connection. Firstly, one of them will create a SDP (by calling .createOffer on the RTCPeerConnection object) which is a massive JSON object which contains key information including details about their media, security, their collection of ICE candidates, and multiple other things. The peer will set this SDP as it's "local description" and then "stringify" the SDP so that it can be sent to the other (remote) peer (through the signalling server). Once the SDP reaches the other peer, that peer sets it as it's "remote description" and then creates their own SDP and sends this back to the sending peer.

#### Completing The Connection

When the peers have exchanged descriptions (SDP's) successfully they will know about each other's details and, most importantly, the multiple ways they can connect to each other through the various ICE candidates of each. The RTCPeerConnection will determine the ICE candidates of each peer that yield the best connection and use these as the IP address' to transfer data to and from (e.g. video, audio, arbitrary data). At this point, any media tracks added to a peer's RTCPeerConnection object will be accessible by the corresponding peer who can then use this media.

### Example With Javascript

#### Server

This callback function runs when someone sends a request to (visits) the server. At first, the final else statement runs because the request will not originate from the .js or .css file, but from the user visiting the domain on their browser. The html file links a .css and .js file within the header tags which loads the necessary CSS and Javascript files to the client's browser.

![image-20210830205715037](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210830205715037.png)

This section initiates a WebSocket server using a https server instantiated with security constraints (serverConfig) and a request handler (handleRequest - the callback above).

![image-20210830213854412](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210830213854412.png)

Whenever a client attempts to establish a connection to the server (through the client Javascript file) the WebSocket server's "connection" event is triggered and the function attached to it runs with an argument which is a WebSocket object (representing the server's connection to the client). This function activates an event that triggers whenever the client sends a message to the server. When this event is triggered it calls the broadcast function which sends the message to every client connected, including the sender.

![image-20210830214247475](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210830214247475.png)

#### Client

The start() function is called when the HTML file is rendered. The createUUID() function returns an ID that will uniquely identify each peer. The next three lines of code checks if a key-value pair with key "displayName" was included in the URL search parameters (e.g. ?displayName=Lewis). If a parameter wasn't included, the code prompts the user to enter their name and then sets this as the label for their own webcam shown on the screen. The final block of code is an object that specifies the constraints for their own webcam stream. In this case the user details the dimensions and frame rate of their video stream and have left out audio.

![image-20210831133514178](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210831133514178.png)

The code below is the rest of the start() function shown above. On the first line it checks if the user's browser supports the MediaDevices API. If it does, it accesses the user's media device with the constraints provided (above) and returns a promise that should resolve to a stream from this media device. The stream is then added to the video HTML element and should appear on the screen of the local user. Once this has completed, it creates a new WebSocket object which attempts to connect to the server with the specified domain and port. Two event listeners are added to the WebSocket connection. The first one (onmessage) triggers when it receives a message from the server (a broadcasted message, originally from a different peer). The second one triggers when the connection opens and uses the .send method to send a message to all peers connected to let them know that this peer has joined.

![image-20210831134810629](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210831134810629.png)

The onmessage event listener uses the callback function below to handle messages that are received. The first if statement checks if the message was either sent by the local peer and was broadcasted back to themselves or if the message is for a different peer. If not, it checks if the destination was set to "all" such that the message was sent by a newly connected peer and is letting all connected peers know. If this is true, peer 1 uses the setUpPeer() function to instantiate a new RTCPeerConnection object which will represent it's peer-to-peer connection to peer 2 (who sent the message with "all"). Then, peer 1 sends a message to the server intended for peer 2 (with dest set to their UUID) which will trigger peer 2 to also call the setUpPeer() function (within the else if statement below) but with an extra parameter (true). This extra parameter will trigger peer 2 to create a SDP, set that as their local description, and send it to peer 1 with type set to "offer" (using the createdDescription() function).

![image-20210831144816668](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210831144816668.png)

When peer 2 sends their SDP to peer 1, the gotMessageFromServer() function (above) is called and the top else if statement below will run. Within this code block, peer 1 sets the remote description of the peer connection to peer 2's SDP. Since this was an offer, peer 1 must answer with their own SDP. Peer 1 creates their own SDP (using createdDescription()) and sends it to peer 2 with type set to "answer". Since the SDP sent has type "answer", the if statement below for peer 2 will return false so peer 2 won't create and send another answer. The final else if statement below checks if the message was an ICE candidate sent by the remote peer (when the remote peer discovers a new one) and adds this to it's collection of ICE candidates from the remote peer.

![image-20210831150729168](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210831150729168.png)

As mentioned above, when the setUpPeer() function is called it adds a new object to the peerConnections object/dictionary. This object has a displayName (display name of the remote peer) and a new RTCPeerConnection object with one argument, "peerConnectionConfig". This argument is an object which holds the URL's of various STUN servers which are queried to identify any external IP addresses of the peer. Three event listeners are added to the peer connection object (pc). The onicecandidate event fires when the peer connection object finds a new ICE candidate and calls the gotIceCandidate() function which sends this newly found ICE candidate to the remote peer of the peer connection object. The ontrack event fires when a media device stream from the remote peer is added (using the .addStream() method) and this calls the gotRemoteStream() function which adds the remote stream to a video HTML element which will make the stream appear on the local peer's screen. Finally, the oniceconnectionstatechange event will fire when a change in the connection is detected. This will call the checkPeerDisconnect() function which checks if the new state indicates that the connection has closed and then deletes all the information about the remote peer (including the remote peer's stream on the local peer's screen).

![image-20210831152649012](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210831152649012.png)

The functions below are simple and have been described already. As can be seen, the objects must be converted to a string to be sent to the server.

![image-20210831154903732](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210831154903732.png)

When a stream is added by the remote peer, the function below runs. The first block creates a HTML video element, sets it's attributes, and adds the remote stream to it. The second block creates a HTML div element, sets it's attributes, and appends the video element to it.

![image-20210831155138646](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210831155138646.png)

Finally, the function below has been described already and checks if the remote peer has disconnected when a connection state change has been disconnected. If so, it deletes the peer connection object linked to the remote peer and removes the corresponding video element from the DOM.

![image-20210831155743762](C:\Users\lewis\AppData\Roaming\Typora\typora-user-images\image-20210831155743762.png)
