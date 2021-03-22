const UglifyJS = require("uglify-js");
const fs = require('fs-extra');

fs.readFile('./src/fast.js', 'utf8' , (err, data) => {
  if (err) console.error(err);
  
  const result = UglifyJS.minify(data).code; 
  
  fs.outputFile('./dist/fast.min.js', result, err => {
    if(err) console.log(err);

    console.log('File created in ./dist/fast.min.js');

  });

});
