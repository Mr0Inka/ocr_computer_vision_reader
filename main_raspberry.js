// Include needed libraries
const Gpio = require('onoff').Gpio;
const Tesseract = require('tesseract.js')
const vision = require('@google-cloud/vision');
const textToSpeech = require('@google-cloud/text-to-speech');
const {Translate} = require('@google-cloud/translate');
const player = require('play-sound')(opts = {player: "mplayer"})
const fs = require('fs');
const say = require('say')
      say.stop()  //Stop any running voice outputs


//Start all gCloud clients
const client = new vision.ImageAnnotatorClient({
      keyFilename: './key.json',
      projectId: 'reader-234408'
});

const voiceClient = new textToSpeech.TextToSpeechClient({
      keyFilename: './key.json',
      projectId: 'reader-234408'
});

const translate = new Translate({
      keyFilename: './key.json',
      projectId: 'reader-234408'
});

var ready = true;



//LED setup
const ledA = new Gpio(17, 'out'); 
const ledB = new Gpio(27, 'out'); 
led(1, 0);  //Turn off led1 on startup
led(2, 0);  //Turn off led2 on startup


//Button setup
const button = new Gpio(4, 'in', 'rising', {debounceTimeout: 10});

button.watch((err, value) => {
  if (err) {
    throw err;
  }
  if(ready){
    ready = false;
    runOCR("./tester.jpg");
    console.log(" > Triggered ... processing!");
    led(2, 1);
  } else {
    console.log(" > Input blocked!");
    if(audio){
      audio.kill(); //Kill running audio outputs and get ready again
    }
    ready = true;
    led(2, 0);
  }
});



//Configure telegram for testing
const https = require('https');
const telegram = require('telegram-bot-api');

var api;
require('dns').resolve('www.google.com', function(err) {
      if (err) {
      } else {
    console.log(" > Telegram active");
    api = new telegram({
            token: "________________________",
            updates: {
              enabled: true
        }
    });
    api.on('update', function(message){
        var messageString = message.message.text;
        var chatId = message.message.chat.id;
        var messageID = message.message.message_id;
        var userName = message.message.from.first_name;
        if("photo" in message.message){
          playFile("./received.mp3")
          console.log("Received Photo")
            photoId = message.message.photo[3].file_id;
            api.getFile({file_id: photoId})
            .then(function(data){ 
                var imgLink = "https://api.telegram.org/file/bot" + "________________________" + "/" + data.file_path
                var timeStamp = Date.now();
                saveImageToDisk(imgLink)
            });
        }
    });
  }
}); 

console.log(" > Waiting for input...");



//Actual OCR functions
function runOCR(image){ //Check connectivity and decide between Google and Tesseract
    require('dns').resolve('www.google.com', function(err) {
      if (err) {
         console.log("\n===============================================================\n > No data connection, using tesseract");
         tesseractOCR(image)
      } else {
         console.log("\n===============================================================\n > Data connection available, using GCloud");
         gcloudOCR(image)
      }
    }); 
}


function gcloudOCR(image){
    var timer = Date.now();
    client
      .textDetection(image)
      .then(results => {
        if(results[0].error == null){
          outOCR(results[0].fullTextAnnotation.text, timer, "Google Cloud OCR")
        } else {
          console.log(error)
        }
      })
      .catch(err => {
        console.error('ERROR:', err);
        ready = true;
        led(2, 0);
      }); 
}

function tesseractOCR(image){
  var timer = Date.now();
    Tesseract.recognize(image)
       .progress(function(result){
        //console.log(result)
       })
       .then(function (result) { 
          outOCR(result.text, timer, "TesseractJS")
       })  
}

function outOCR(text, time, service){
  if(service == "TesseractJS"){
    say.speak(text); //Speak Tesseract output offline
    ready = true;
    led(2, 0);
  } else {
    detectLanguage(text)
  }
  var finished = (Date.now() - time) / 1000;
  console.log("===============================================================\n" + text + "===============================================================\n > Service: " + service + "\n > Time: " + finished.toFixed(1) + " seconds\n===============================================================\n\n")
  //Print results
}

function detectLanguage(text){
    translate
      .detect(text)
      .then(results => {
          var lang = results[0].language
          console.log("Using language: " + lang)
          gcloudVoice(text, lang)
      })
      .catch(err => {
        console.error('ERROR:', err);
        ready = true;
        led(2, 0)
      });
}


function gcloudVoice(text, lang){ 
  var fileName = "voice_" + Date.now() + ".mp3"
  var preset = {}
  if(lang == "de"){
    preset = {languageCode: 'de-DE', name: "de-DE-Wavenet-B", ssmlGender: 'NEUTRAL'}
  } else {
    preset = {languageCode: 'en-US', name: "en-US-Wavenet-D", ssmlGender: 'NEUTRAL'}
  }
  const request = {
    input: {text: text},
    voice: preset,
    audioConfig: {audioEncoding: 'MP3'},
  };
  voiceClient.synthesizeSpeech(request, (err, response) => {
    if (err) {
      console.error('ERROR:', err);
      ready = true;
      led(2, 0)
      return;
    }
    fs.writeFile(fileName, response.audioContent, 'binary', err => {
      if (err) {
        console.error('ERROR:', err);
        ready = true;
        led(2, 0)
        return;
      }
      console.log(' > Audio content written to file: ' + fileName);
      playFile(fileName)
    });
  });
}

var audio;

function playFile(name){
  if(audio){
    audio.kill() //If there is an audio out running, kill it!
  }
  audio = player.play("./" + name, function (err) {
  if (err) {
    ready = true;
    led(2, 0)
    console.log("Error: " + err);
  }
  console.log("Audio finished");
  ready = true;
  led(2, 0)
 });
}

setInterval(function(){
    setStatus(); //Check LED status every 1.2s
}, 1200);

function setStatus(){
  require('dns').resolve('www.google.com', function(err) {
    if (err) {
	    console.log("No connection");
	    led(1,0);
    } else {
	    console.log("Connected");
	    led(1, 1, 500); //Trigger led and turn it off after 500ms
    }
  }); 
}

var time1;
var time2; 

function led(id, state, timeOut){
  if(id == 1){
	  ledB.write(state, err => { 
   	  if (err) {
     	  throw err;
   	  } else if(timeOut) {
	      time1 = setTimeout(function(){
          ledB.write(0, err => { 
   		      if (err) {
     		      throw err;
 	  	      }
		      });
        }, timeOut);	
      }
	  });
   } else {
	  ledA.write(state, err => { 
   	  if (err) {
     	  throw err;
   	  } else if(timeOut) {
        clearTimeout(time2);
	      time2 = setTimeout(function(){
          ledA.write(0, err => { 
   		      if (err) {
     		      throw err;
 	  	      }
		      });
        }, timeOut);	
      }
	  });
  }
}

function saveImageToDisk(url) {
    var file = fs.createWriteStream("telegram.jpg");
    var request = https.get(url, function(response) {
      response.pipe(file);
      console.log("Saved image")
      setTimeout(function(){
        runOCR("./telegram.jpg")
      }, 600)
    });
}



 


