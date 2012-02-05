#! /usr/bin/env node
"use strict";
var net = require("net");
var path = require("path");
var fs = require("fs");
var socketio = require("socket.io");
var http = require("http");
var dgram = require("dgram");
var util = require("util");
var rawFlags = {};
var quartzFlags = {
	keeps: {
		showDrawing: false
	}
};

/**
 * Adopted from jquery's extend method. Under the terms of MIT License.
 *
 * http://code.jquery.com/jquery-1.4.2.js
 *
 * Modified by mscdex to use Array.isArray instead of the custom isArray method
 */
function extend() {
  // copy reference to target object
  var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

  // Handle a deep copy situation
  if (typeof target === 'boolean') {
	deep = target;
	target = arguments[1] || {};
	// skip the boolean and the target
	i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== 'object' && !typeof target === 'function')
	target = {};

  var isPlainObject = function(obj) {
	// Must be an Object.
	// Because of IE, we also have to check the presence of the constructor property.
	// Make sure that DOM nodes and window objects don't pass through, as well
	if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
	  return false;
	
	var has_own_constructor = hasOwnProperty.call(obj, 'constructor');
	var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
	  return false;
	
	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.

	var last_key;
	for (var key in obj)
	  last_key = key;
	
	return typeof last_key === 'undefined' || hasOwnProperty.call(obj, last_key);
  };


  for (; i < length; i++) {
	// Only deal with non-null/undefined values
	if ((options = arguments[i]) !== null) {
	  // Extend the base object
	  for (name in options) {
		src = target[name];
		copy = options[name];

		// Prevent never-ending loop
		if (target === copy)
			continue;

		// Recurse if we're merging object literal values or arrays
		if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
		  var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};

		  // Never move original objects, clone them
		  target[name] = extend(deep, clone, copy);

		// Don't bring in undefined values
		} else if (typeof copy !== 'undefined')
		  target[name] = copy;
	  }
	}
  }

  // Return the modified object
  return target;
};

function makeString(hash){
	var str = "";
	for(var i in hash){
		var j = hash[i];
		str += i + " = " + j + "\n";
	}
	return str;
}
function stream(file, req, res, type){
	fs.stat(file, function(err, stat){
	if(err){
		throw err;
	}
	if (!stat.isFile()){
		res.end();
	}
	
	var start = 0;
	var end = 0;
	var range = req.headers.Range;
	if (range != null) {
	start = parseInt(range.slice(range.indexOf('bytes=')+6,
	  range.indexOf('-')));
	end = parseInt(range.slice(range.indexOf('-')+1,
	  range.length));
	}
	if (isNaN(start)){
		start = 0;
	}
	if (isNaN(end) || end == 0) end = stat.size;
	
	if (start > end){
		res.end();
	}
	
	var date = new Date();

	if(range == null){
		res.writeHead(200, {
			"Date": date.toUTCString(),
			"Connection": "close",
			"Content-Type": type,
			"Content-Length": stat.size
		});
	}else{
	
	res.writeHead(206, { // NOTE: a partial http response
		'Date': date.toUTCString(),
		'Connection': 'close',
		// 'Cache-Control':'private',
		'Content-Type': type,
		'Content-Length': end - start,
		'Content-Range': 'bytes '+start+'-'+end+'/'+stat.size,
		'Accept-Ranges':'bytes',
		// 'Server':'CustomStreamer/0.0.1',
		'Transfer-Encoding':'chunked'
	});

	}
	
	var stream = fs.createReadStream(file, {
		flags: 'r', start: start, end: end
	});
	stream.pipe(res);
	});
}
function writeOutput(){
	runFixes();
	var string = makeString(writeFlags);
	try{
		 fs.writeFileSync(options.outfile,string);
	}catch(e){
	}
}
var added = {
	DownAndTogo: function(){
		if(writeFlags.Down && writeFlags.ToGo){
			return writeFlags.Down+" and "+writeFlags.ToGo;
		}else{
			return "";
		}
	},
	timeoutsLeftHome: function(){
		if(writeFlags.timeout == "home"){
			return writeFlags.HToL;
		}else{
			return "";
		}
	},
	timeoutsLeftAway: function(){
		if(writeFlags.timeout == "away"){
			return writeFlags.VToL;
		}else{
			return "";
		}
	}
};
var fixes = {
	Down: function(down){
		switch(down){
			case "1":
				return "1st";
			case "2":
				return "2nd";
			case "3":
				return "3rd";
			case "4":
				return "4th";
			default:
				return down;
		}
	},
	ToGo: function(togo){
		if(togo <= 10 && togo == rawFlags.BallOn){
			return "G";
		}else{
			return togo;
		}
	},
	GameClk: function(time){
		if(time.indexOf("0:") == 0){
			return time.substring(2);
		}else{
			return time;
		}
	},
	BallOn: function(on){
		if(on){
			return "on the "+on;
		}else{
			return "";
		}
	},
	Period: function(p){
		return writeFlags.periodPrefix+p;
	}
};
var writeFlags = {};
function runFixes(){
	for(var i in rawFlags){
		if(i in fixes){
			writeFlags[i] = fixes[i](rawFlags[i]);
		}else{
			writeFlags[i] = rawFlags[i];
		}
	}
	for(var i in added){
		writeFlags[i] = added[i]();
	}
}
function parseScoreboard(infile){
	var ignores = ["HTName","VTName"];
	var string = fs.readFileSync(infile).toString();
	parseData(string, ignores);
}
var options = require("nomnom").opts({
	infile: {
		abbr: "i",
		full: "in-file",
		list: true,
		help: "Scoreboard file to poll automatically",
		callback: function(arg){
			if(!path.existsSync(arg)){
				return "File "+arg+" does not exist!";
			}else{
			try{
					fs.watchFile(arg, {persistent: true, interval: 60}, function(curr,prev){
							if(curr.mtime.getTime() != prev.mtime.getTime()){
								parseScoreboard(arg);
							 	writeOutput();
								sendUpdates();
							}
					});
			}catch(e){
				setInterval(function(){
					parseScoreboard(arg);
					writeOutput();
					sendUpdates();
				},60);
			}
				parseScoreboard(arg);
			}
		}
	},
	startHostedNetwork: {
		abbr: "s",
		full: "start-hosted-network",
		flag: true,
		help: "Begin acting as a wireless access point on start",
		callback: function(){
			var proc = require('child_process').spawn("netsh", ["wlan", "start", "hostednetwork"]);
			proc.on("exit", function(code){
				if(code == 0){
					console.log("Successfully started hosted network");
				}else{
					console.error("Hosted network not started; threw error code "+code);
				}
			});
		}
	},
	preload: {
		abbr: "l",
		full: "preload-file",
		list: true,
		help: "Scoreboard file to parse once on start",
		callback: function(arg){
			if(!path.existsSync(arg)){
				return "File "+arg+" does not exist!";
			}else{
				parseScoreboard(arg);
				writeOutput();
			}
		}
	},
	outfile: {
		abbr: "o",
		full: "out-file",
		help: "File to write for Livetext",
		default: "livetext.txt"
	},
	port: {
		abbr: "p",
		full: "port",
		help: "Port to listen on for Socket server",
		default: 8989
	},
	httpport: {
		abbr: "h",
		full: "http-port",
		help: "Port to listen on for HTTP server",
		default: 8990
	}
}).parseArgs();
writeOutput();
var parseAdds = {
	homePossPath: function(){
		switch(rawFlags.Poss){
			case "H":
				return "C://Users//Truck Laptop//Desktop//Images//Possession.png";
			default:
				return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	awayPossPath: function(){
		switch(rawFlags.Poss){
			case "V":
				return "C://Users//Truck Laptop//Desktop//Images//Possession.png";
			default:
				return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	timeoutPath: function(){
		if(rawFlags.timeout == "on"){
			return "C://Users//Truck Laptop//Desktop//Images//Timeouts.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	flagPath: function(){
		if(rawFlags.flag == "on"){
			return "C://Users//Truck Laptop//Desktop//Images//Flag.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	}
}
function parseData(x,ignores){
	var arr = x.replace(/\r/g,"").split("\n");
	for(var i = 0; i < arr.length; i++){
		var lr = arr[i].split(" = ");
		if(lr.length != 2){
			continue;
		}
		if(ignores && ignores.indexOf(lr[0]) != -1){
			continue;
		}
		rawFlags[lr[0]] = lr[1];
	}
	for(var i in parseAdds){
		rawFlags[i] = parseAdds[i]();
	}
}
var server = net.createServer(function(c){
	console.log("Socket connection from " + c.remoteAddress);
	c.on("data",function(data){
	if(data){
			console.log("Received data from socket: " + data.toString());
			parseData(data.toString());
			writeOutput();
			sendUpdates();
	}
	});
});
function sendUpdate(res){
	res.write("data: "+JSON.stringify(rawFlags)+"\n\n");
}
function sendUpdates(){
	for(var i = 0; i < ESRes.length; i++){
		sendUpdate(ESRes[i]);
	}
	io.sockets.emit("state",rawFlags);
}
var ESRes = [];
server.listen(options.port, "0.0.0.0");
console.log("Socket listening on port "+options.port);
var hserver = http.createServer(function(req,res){
	if(req.method == "POST"){
		req.on("data",function(data){
			console.log("Received data over HTTP: "+data.toString());
			parseData(data.toString());
		});
		req.on("end",function(){
			writeOutput();
			sendUpdates();
			res.setHeader("Content-Type","text/plain");
			res.end("OK");
		});
	}else{
		switch(req.url.toLowerCase()){
			case "/favicon.ico":
			case "/favicon.png":
			stream("favicon.png", req, res, "image/png");
				break;
			case "/shortcuts.png":
			stream("shortcuts.png", req, res, "image/png");
			break;
		case "/stats.json":
			res.setHeader("Content-Type","application/json");
			res.end(JSON.stringify(rawFlags));
			break;
		case "/es":
			res.setHeader("Content-Type","text/event-stream");
			ESRes.push(res);
			res.on("close",function(){
				ESRes.splice(ESReqs.indexOf(res),1);
			});
			sendUpdate(res);
			break;
		case "/ocr":
			stream("OCR.htm", req, res, "text/html");
			break;
		case "/draw":
			stream("draw.htm", req, res, "text/html");
			break;
		case "/debug":
			stream("Debug.htm", req, res, "text/html");
			break;
		case "/manage":
			stream("Manage.htm", req, res, "text/html");
			break;
		case "/test.mp4":
			stream("test.mp4", req, res, "video/mp4");
			break;
		default:
			if(req.url.toLowerCase().indexOf("/images/") == 0){
				if(path.existsSync("."+req.url)){
					stream("."+req.url, req, res, "image/png");
					   			break;
				}
					}
			stream("Manual.htm", req, res, "text/html");
			break;
		}
	}
});
var io = socketio.listen(hserver);
io.configure(function(){
	io.set("log level",1);
	io.set("transports", ["websocket", "xhr-polling"]);
});
hserver.listen(options.httpport, "0.0.0.0");
console.log("HTTP server listening on port "+options.httpport);
var drawNum = 0;
io.sockets.on("connection", function(socket){
	socket.emit("state", rawFlags);
	socket.emit("quartzState", quartzFlags);
	socket.on("writeImage", function(data){
		var buf = new Buffer(data, 'base64');
		fs.writeFile("drawings/"+drawNum+".png", buf, function(){
			rawFlags.drawingPath = path.resolve("drawings/"+drawNum+".png").replace(/\//g,"//");
			drawNum++;
			writeOutput();
		});
	});
	socket.on("sendUDP", function(data){
		extend(true, quartzFlags, data);
		UDPSendObject(data);
	});
	socket.on("update", function(data){
		for(var i in data){
			rawFlags[i] = data[i];
		}
		for(var i in parseAdds){
			rawFlags[i] = parseAdds[i]();
		}
		writeOutput();
	});
});
var udpSocket = dgram.createSocket("udp4");
udpSocket.bind(50000);
udpSocket.on("message", function(msg, rinfo){
	console.log("Quartz Message: \""+msg+"\" from "+rinfo.address+":"+rinfo.port);
});
udpSocket.setBroadcast(true);
function UDPSendObject(obj){
	UDPSendText(JSON.stringify(obj));
}
function UDPSendText(text){
	var newText = "";
	for(var i = 0; i < text.length; i++){
		newText += "\0\0\0"+text[i];
	}
	var buffer = new Buffer(newText.substring(0,420), "utf8");
	var buffer2 = new Buffer(newText.substring(420), "utf8");
	udpSocket.send(buffer, 0, buffer.length, 50000, "192.168.1.255");
	udpSocket.send(buffer2, 0, buffer2.length, 50001, "192.168.1.255");
}