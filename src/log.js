var arDrone = require('ar-drone');
var client = arDrone.createClient();

//no navdata!
client.on('navdata', console.log);
