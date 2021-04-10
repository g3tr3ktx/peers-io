const socket = io();

var myClientid;
var isHost;

var pcCons = {};

var localVideo = document.getElementById('localVideo');
var localStream;

var localPeer;

var roomName;

var form = document.getElementById('form');
var messageInput = document.getElementById('messageInput');

var inputRoom = document.getElementById('inputRoom');
var joinRoomButton = document.getElementById('join-room-button');
var messages = document.getElementById('messages');

socket.on('save client id', data => myClientid = data);
socket.on('isHost', () => {isHost = true;
  navigator.mediaDevices.getDisplayMedia({video:true}).then(gotStream);});
socket.on('chat message', msg => {
  var item = document.createElement('li');
  item.textContent = msg;
  messages.prepend(item);
  window.scrollTo(0, document.body.scrollHeight);
});

socket.on('client joined', clientId => {
  console.log('client joined called')
  if(isHost) {
    createPeerConnectionByHost(clientId);
    doCall(clientId);
  }
});

socket.on('message', (message, clientId) => {
  if(clientId === myClientid && !isHost) {
    if(message.type === 'offer') {
      createPeerConnectionByClient(clientId);
      localPeer.setRemoteDescription(new RTCSessionDescription(message));
      doAnswer(clientId);
    } else if(message.type === 'candidate') {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      localPeer.addIceCandidate(candidate);
    }
  }

  if(isHost) {
    if(message.type === 'answer') {
      console.log('Samar', clientId, 'my', myClientid);
      pcCons[clientId].setRemoteDescription(new RTCSessionDescription(message));
    } else if(message.type === 'candidate') {
        var candidate = new RTCIceCandidate(
          {
            sdpMLineIndex: message.label,
            candidate: message.candidate
          }
        );
        pcCons[clientId].addIceCandidate(candidate);
      }
    }

  }
);

function sendMessage(message, clientId) {
  socket.emit('message', message, clientId, roomName);
}

joinRoomButton.onclick = () => {
  roomName = inputRoom.value;
  socket.emit('create or join', inputRoom.value)
};

form.onsubmit = (e) => {
  e.preventDefault();
  if(!roomName){
    alert('Enter a room first');
    return;
  }
  if(messageInput.value){
    console.log(messageInput.value)
      socket.emit('chat message', roomName, messageInput.value);
      messageInput.value = '';
  }
}

function gotStream(stream) {
    localStream = stream;
    localVideo.srcObject = stream;
}

const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}

function createPeerConnectionByHost(clientId){
  pcCons[clientId] = new RTCPeerConnection(configuration);
  pcCons[clientId].onicecandidate = (event) => handleIceCandidate(event, clientId);
  pcCons[clientId].addStream(localStream);
}

function createPeerConnectionByClient(clientId){
  localPeer = new RTCPeerConnection(configuration);
  localPeer.onicecandidate = (event) => handleIceCandidate(event, clientId);
  localPeer.onaddstream = (event) => localVideo.srcObject = event.stream;
}

function handleIceCandidate(event, clientId){
  if(event.candidate){
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    }, clientId)
  }
}

async function doCall(clientId) {
  var offer = await pcCons[clientId].createOffer();
  pcCons[clientId].setLocalDescription(offer);
  sendMessage(offer, clientId);
}

async function doAnswer(clientId) {
  var answer = await localPeer.createAnswer();
  localPeer.setLocalDescription(answer);
  sendMessage(answer, clientId);
}