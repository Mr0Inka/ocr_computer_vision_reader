const Tesseract = require('tesseract.js')
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
      keyFilename: './key.json',
      projectId: 'reader-234408'
});

runOCR("./tester.jpg")

function runOCR(image){
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
    	  outOCR(results[0].fullTextAnnotation.text, timer, "Google Cloud OCR")
    	})
    	.catch(err => {
    	  console.error('ERROR:', err);
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
	var finished = (Date.now() - time) / 1000;
	console.log("===============================================================\n" + text + "===============================================================\n > Service: " + service + "\n > Time: " + finished.toFixed(1) + " seconds\n===============================================================\n\n")
}
