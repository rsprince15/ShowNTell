import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Action } from 'rxjs/internal/scheduler/Action';

var localStream = null;
var remoteStream = null;
var peerConnection = null;

export interface Offer { sdp: string; type: string; }

const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

@Component({
  selector: 'app-videochat',
  templateUrl: './videochat.component.html',
  styleUrls: ['./videochat.component.css']
})
export class VideochatComponent implements OnInit {

  offer: Observable<Offer[]>;

  @ViewChild('callDiv')
  public callDiv: ElementRef;

  @ViewChild('videoDiv')
  public videoDiv: ElementRef;

  @ViewChild('localVideo')
  public localVideo: ElementRef;

  @ViewChild('remoteVideo')
  public remoteVideo: ElementRef;
  
  items: Observable<any>;
  constructor(private firestore: AngularFirestore) {}

  ngOnInit(): void {  }

  ngAfterViewInit() {
    this.videoDiv.nativeElement.style.display = "none";
  }

  registerPeerConnectionListeners() {
    peerConnection.addEventListener('icegatheringstatechange', () => {
      console.log(
          `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
    });

    peerConnection.addEventListener('connectionstatechange', () => {
      console.log(`Connection state change: ${peerConnection.connectionState}`);
    });

    peerConnection.addEventListener('signalingstatechange', () => {
      console.log(`Signaling state change: ${peerConnection.signalingState}`);
    });

    peerConnection.addEventListener('iceconnectionstatechange ', () => {
      console.log(
          `ICE connection state change: ${peerConnection.iceConnectionState}`);
    });
  }

  createRoom() {
    const roomRef = this.firestore.collection('rooms').doc("roomA");
    console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);
  
    this.registerPeerConnectionListeners();
  
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Code for collecting ICE candidates below
    const callerCandidatesCollection = roomRef.collection('callerCandidates');

    peerConnection.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        console.log('Got final candidate!');
        return;
      }
      console.log('Got candidate: ', event.candidate);
      callerCandidatesCollection.add(event.candidate.toJSON());
    });

    async function getOffer(){
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log('Created offer:', offer);

      const roomWithOffer = {
        'offer': {
          type: offer.type,
          sdp: offer.sdp,
          russ: true
        }
      };
      await roomRef.set(roomWithOffer);
    }

    getOffer();
    
    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
        console.log('Add a track to the remoteStream:', track);
        remoteStream.addTrack(track);
      });
    });
  
    // // Listening for remote session description below
    roomRef.snapshotChanges().pipe(
      map(async snapshot => {
      const data = snapshot.payload.data();
      var stringifiedData = JSON.stringify(data);
      var parsedData = JSON.parse(stringifiedData);

      if (!peerConnection.currentRemoteDescription && parsedData && parsedData.answer) {
        console.log('Got remote description: ', parsedData.answer);
        const rtcSessionDescription = new RTCSessionDescription(parsedData.answer);
        await peerConnection.setRemoteDescription(rtcSessionDescription);
      }
    }));
  
    // Listen for remote ICE candidates below
    roomRef.collection('calleeCandidates').snapshotChanges().pipe(
      map(snapshot => {
        snapshot.forEach(async change => {
          if (change.type === 'added') {
            let data = change.payload.doc.data();
            console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
            await peerConnection.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      })
    );
  }

  joinRoomById(){
    
    const roomRef = this.firestore.collection('rooms').doc("roomA");
  
    console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);
    this.registerPeerConnectionListeners();
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
    // Code for collecting ICE candidates below
    const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
    peerConnection.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        console.log('Got final candidate!');
        return;
      }
      console.log('Got candidate: ', event.candidate);
      calleeCandidatesCollection.add(event.candidate.toJSON());
    });

    // Code for collecting ICE candidates above
    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
        console.log('Add a track to the remoteStream:', track);
        remoteStream.addTrack(track);
      });
    });

    // Code for creating SDP answer below
    const offer = roomSnapshot.data().offer;
    console.log('Got offer:', offer);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    console.log('Created answer:', answer);
    await peerConnection.setLocalDescription(answer);
    const roomWithAnswer = {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
    };
    await roomRef.update(roomWithAnswer);

    // Listening for remote ICE candidates below
    roomRef.collection('callerCandidates').snapshotChanges().pipe(
      map(snapshot => {
        snapshot.forEach(async change => {
          if (change.type === 'added') {
            let data = change.payload.doc.data();
            console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
            await peerConnection.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      })
    );
  }

  startVideoChat(){

    // Get User Media
    const stream = navigator.mediaDevices.getUserMedia({video: true, audio: true}).then(stream => {;
      this.localVideo.nativeElement.srcObject = stream;
      localStream = stream;
      remoteStream = new MediaStream();
      this.remoteVideo.nativeElement.srcObject = remoteStream;
    });
    this.callDiv.nativeElement.style.display = "none";
    this.videoDiv.nativeElement.style.display = "block";

    // Get Collection from firestore
    this.offer = this.firestore.collection<Offer>('rooms').snapshotChanges().pipe(map(actions => {
      return actions.map(a => {
      const data = a.payload.doc.data();
      return data;
      })
    }));

    // Figure out if Russell is connected
    this.offer.subscribe(x => {
      x.map(i => {

          var stringifiedData = JSON.stringify(i);
          var parsedData = JSON.parse(stringifiedData);

          if (parsedData.offer.russ)
          {
            console.log("Joining Room");
            this.joinRoomById();
          } else {
            console.log("Creating Room");
            this.createRoom();
          }
      });
    });
  }
}
