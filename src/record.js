/*
AR Drone Navdata Recorder
Records the position change and orientation of ar drones
Howon Lee
*/
var arDrone = require('ar-drone');
var util = require('util');
var fs = require('fs');
var Pouch = require('pouchdb');
var client = arDrone.createClient();

client.config('general:navdata_demo', 'FALSE');
client.setMaxListeners(0);

var DEBUG = false;

/*
Formatting of the Default Record
copterVersion: version of the AR drone
vdelArray: array filled with velocity readings. You will be able to reconstruct paths via dead reckoning.
oriArray: array filled with orientation readings. You will be able to reconstruct orientations.

*/
var defaultRecord = {_id: "defaultcopter", remoteLoc: "", copterVersion : -1, intervalTime : 0, name: "", vdelArray : [], oriArray : []};
var currRecord = JSON.parse(JSON.stringify(defaultRecord));//deep copy
var isRecording = false;
var recordLoop = null;
var emitNav = null;
var intervalTime = 10;//after this many milliseconds, we look again
currRecord.intervalTime = intervalTime;
var intervalCount = 50;//after this many frames, we get acknowledgement
var currIntervalCount = 0;
var ourPouch;

//user io
console.log("Welcome to CopterPedagog");
console.log("We love awful names!");
console.log("What will be the name of the recording?");
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.once("data", function(text){
        currRecord.name = text.replace(/^\s+|\s+$/g, "");
        currRecord._id = currRecord.name;
        console.log("Type in 'b' and press enter to begin");
        console.log("Type in 'q' and press enter to quit");
        console.log("Type in 'c' and press enter to clear current data");
        console.log("Type in 'x' and press enter to show current data");
        console.log("Type in 'w' and press enter to sync with remote");
        console.log("Type in 's' and press enter to save current data");
        console.log("Type in 'p' and press enter to pause");
        process.stdin.on('data', function(text){
            if (text === 'b\n' || text === 'b\r\n'){
                start();
            }
        });
    });

function start(){
    if (isRecording){
        console.log("alreay started");
        return;
    }
    console.log("started");
    isRecording = true;
    if (DEBUG){
        emitNav = setInterval(emitNavData, intervalTime); 
    } else {
        client.takeoff();
        client.stop();
    }
    recordLoop = setInterval(loop, intervalTime);
    if (process.stdin.listeners('data').length < 2){
        process.stdin.on('data', chooseCmd);
    }
}

function chooseCmd(text){
    if (text === 'q\n' || text === 'q\r\n'){
        isRecording = false;
        finish();
    }
    if (text === 'c\n' || text === 'c\r\n'){
        currRecord = JSON.parse(JSON.stringify(defaultRecord));//deep copy
    }
    if (text === 'x\n' || text === 'x\r\n'){
        console.log(JSON.stringify(currRecord));
    }
    if (text === 's\n' || text === 's\r\n'){
        if (isRecording){
            isRecording = false;
        }
        console.log("saving...");
        pause();
        save();
    }
    if (text === 'w\n' || text === 'w\r\n'){
        if (isRecording){
            isRecording = false;
        }
        pause();
        doSync();
    }
    if (text === 'p\n' || text === 'p\r\n'){
        if (isRecording){
            isRecording = false;
            pause();
        }
    }
}

function loop(){
    if (isRecording){
        client.once("navdata", recordNavDat);//once because this whole thing gets called once every 1/30 secs
    }
}

/*
    for debug purposes
*/
function emitNavData(){
    var tempnav = {demo: {velocity : [0,0,0], rotation: [0,0,0] } };
    client.emit("navdata", tempnav);
}

function recordNavDat(navdata){
    if (typeof navdata.demo.velocity == "object" &&
        typeof navdata.demo.rotation == "object") {
        //occasionally, we get arrays, these happen when we don't get a reading
        currRecord.vdelArray.push(navdata.demo.velocity);
        currRecord.oriArray.push(navdata.demo.rotation);
    }
    if (currIntervalCount >= intervalCount){
        console.log("receiving signal from copter");
        currIntervalCount = 0;
    }
    currIntervalCount += 1;
}

function pause(){
    clearInterval(recordLoop);
    if (DEBUG){
        clearInterval(emitNav);
    } else {
        client.stop();
        client.land();
        client = arDrone.createClient();//hacky way to get it to land, see if it works
    }
    console.log("recording paused; press 'b' to restart");
}

function save(){
    //this is where pouch comes in
    console.log("saving in filesystem...");
    fs.writeFile(currRecord.name + ".json", JSON.stringify(currRecord));
    console.log("saving in pouch to remote...");
    saveToPouch();
}

function saveToPouch(){
	Pouch(currRecord.name, function(err, db){
		ourPouch = db;
		ourPouch.put(currRecord, function(err, response){
			if (err) { console.log(JSON.stringify(err)); }
		    else { console.log("saved to local pouch"); }
		});
	});
}

function doSync(){
    if (!ourPouch){
        console.log("save first, then sync");
        return;
    }
    console.log("where should I sync?");
    process.stdin.once("data", function(text){
        currRecord.remoteLoc = text;
        console.log("remote location specified.");
        Pouch(currRecord.remoteLoc, function(err, remote){
			if (err) { console.log(JSON.stringify(err)); }
            else {
                Pouch.replicate(ourPouch, remote, function(err, changes){
			        if (err) { console.log(JSON.stringify(err)); }
                    else {
                        console.log("successful sync");
                    }
                });
            }
        });
    });
}

function finish(){
    clearInterval(recordLoop);
    if (DEBUG){
        clearInterval(emitNav);
    } else {
        client.land();
        client = arDrone.createClient();//hacky way to get it to land, see if it works
    }
    console.log("finished.");
    process.exit();
}
