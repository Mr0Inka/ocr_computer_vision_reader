# ocr_computer_vision_reader

This is the repository for a portable, RaspberryPi based device to help out (partially) blind people to read text and recognize their surroundings. It uses the GoogleCloud API to do an OCR operation and convert the results to Wavefront voices if there is an internet connection. In the event of having no connection, TesseractJS will do the job and hand the result over to sayJS, which will take longer with a lower voice quality.
