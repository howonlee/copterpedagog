"use strict";

var arDrone = require('ar-drone');
var util = require('util');
var fs = require('fs');
var Pouch = require('pouchdb');
var client = arDrone.createClient();

//get the record here
var DEBUG = true;
var record;
var filePosition = 0;//position in list of coordinates
var text = "";
var emitRecord = null;
var remoteUrl = null;
var remoteDb = null;
var currOri = {theta:0, phi:0, psi:0};
console.log("Replay from a remote db? (y/n)");

//user io
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.once('data', function(text){
	text = text.replace(/(\r\n|\n|\r)/gm,""); //remove line breaks
    if (text.charAt(0) == "y" || text.charAt(0) == "Y"){
        remoteInit();
    }
    if (text.charAt(0) == "n" || text.charAt(0) == "N"){
        fileInit();
    }
});

function getDbPart(remoteUrl){
    var lastFSlash = remoteUrl.lastIndexOf("/");
    return remoteUrl.substring(lastFSlash + 1);
}

function getRemote(id){
    var ourPouch;
    Pouch(remoteUrl, function(err, db){
            ourPouch = db
            if (err) { console.log(JSON.stringify(err)); }
            else {
            ourPouch.get(id, function(err, doc){
                record = JSON.parse(JSON.stringify(doc));
                console.log("Successfully downloaded the flight");
                console.log("Connect your wifi back to the drone. Then, enter any key");
                process.stdin.once("data", function(text){
                    playBack();
                });
            });
        }
    });
}

function remoteInit(){
    console.log("What's the url of the remote?");
    process.stdin.once('data', function(remote){
        remoteUrl = remote.replace(/(\r\n|\n|\r)/gm,""); //remove line breaks
        remoteDb = getDbPart(remoteUrl);
        console.log("What's the id of the movement record you want to play?");
        process.stdin.once('data', function(id){
            getRemote(id);
        });
    });
}

function fileInit(){
    console.log("What file should I replay?");
    console.log("Note the file must end in .json");
    process.stdin.once('data', function(filename){
        filename = filename.replace(/(\r\n|\n|\r)/gm,""); //remove line breaks
        console.log("Opening: " + text);
        fs.readFile(filename, "utf8", function(err, data){
            if (err){
                console.log(err);
                process.exit();
            }
            record = JSON.parse(data);
            playBack();
            });
        });
}

function emitRecordData(){
    var vel = record.vdelArray[filePosition];
    var ori = record.oriArray[filePosition];
    if (vel instanceof Array){
        vel = {x:0, y:0, z:0};
    }
    if (ori instanceof Array){
        ori = {theta: 0, phi: 0, psi: 0};
    }
	if (DEBUG){
        console.log("currori");
        console.log(currOri);
		console.log("Velocity Delta:");
		console.log(vel);
		console.log("Orientation");
		console.log(ori);
        var testthetadel = (currOri.theta - ori.theta);
        var testphidel = (currOri.phi - ori.phi);
        var testpsidel = (currOri.psi - ori.psi); //ar-drone fails to do yaw correctly
        console.log("theta del");
        console.log(testthetadel);
        console.log("phi del");
        console.log(testphidel);
        console.log("psi del");
        console.log(testpsidel);
	}
	if (typeof vel == "object" &&
		typeof ori == "object") {
        client.stop();
        var thetadel = currOri.theta - ori.theta;
        var phidel = currOri.phi - ori.phi;
        var psidel = currOri.psi - ori.psi;
        if (thetadel > 0){
            client.front(thetadel);
        } else {
            client.back(-thetadel);
        }
        if (phidel > 0){
            client.left(phidel);
        } else {
            client.right(-phidel);
        }
        if (psidel > 0){
            client.clockwise(psidel);
        } else {
            client.counterClockwise(-psidel);
        }
        currOri.theta = ori.theta;
        currOri.phi = ori.phi;
        currOri.psi = ori.psi;
    }
    
	filePosition += 1;
	if (!record.vdelArray[filePosition]){
        finish();
	}
}

function playBack(){
    var interval = record.intervalTime;
    var name = record.name;
    console.log("printing a frame every " + interval + " millisecs");
    console.log("recording name: " + name);
	console.log("takeoff");
	client.takeoff();
    process.stdin.on('data', function(text){
        finish();
    });
	emitRecord = setInterval(emitRecordData, interval); 
}

function finish(){
    client.stop();
    client.land();
	console.log("finished replaying, press any key to exit");
	process.stdin.once('data', function(text){
    	process.exit();
	}
}
