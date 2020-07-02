import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-videochat',
  templateUrl: './videochat.component.html',
  styleUrls: ['./videochat.component.css']
})
export class VideochatComponent implements OnInit {
  @ViewChild('callDiv')
  public callDiv: ElementRef;

  @ViewChild('videoDiv')
  public videoDiv: ElementRef;

  @ViewChild('localVideo')
  public localVideo: ElementRef;

  @ViewChild('remoteVideo')
  public remoteVideo: ElementRef;

  ngOnInit(): void {  }

  ngAfterViewInit() {
    this.videoDiv.nativeElement.style.display = "none";
  }


  myFunc(){
    const stream = navigator.mediaDevices.getUserMedia({video: true, audio: true}).then(stream => {;
      this.localVideo.nativeElement.srcObject = stream;
    });
    this.callDiv.nativeElement.style.display = "none";
    this.videoDiv.nativeElement.style.display = "block";
  }

  // async function openUserMedia(e) {
  //   const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  //   document.querySelector('#localVideo').srcObject = stream;
  // }
}
