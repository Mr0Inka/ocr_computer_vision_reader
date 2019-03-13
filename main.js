const vision = require('@google-cloud/vision');
 
const client = new vision.ImageAnnotatorClient({
      keyFilename: './key.json',  //Service account keyfile
      projectId: 'project_id' //Your project ID from Google Cloud
});

var timer = Date.now();
 
client
  .textDetection('./tester.jpg') //Detect this image's text
  .then(results => {
    console.log(results[0].fullTextAnnotation.text);
    console.log("Took " + (Date.now() - timer) + "ms")
  })
  .catch(err => {
    console.error('ERROR:', err);
  });
