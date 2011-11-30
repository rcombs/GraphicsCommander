#! /usr/bin/env node
var net = require("net");
var cliui = require("cli-ui");
var options = require("nomnom").opts({
	host: {
		abbr: "h",
		help: "Host to connect to",
		required: true
	},
	port: {
		abbr: "p",
		help: "Port to connect on",
		default: 8989
	}
}).parseArgs();
var sock = new net.Socket({type: "tcp4"});
sock.on("error",function(error){
	if(error.code == "ECONNREFUSED"){
		console.log("Connection refused, exiting...");
		process.exit(1);
		return;
	}else if(error.code == "ENOTFOUND"){
		console.log("Host not found, exiting...");
		process.exit(1);
		return;
	}
	console.log(error);
	sock.connect(options.port,options.host,function(){
		console.log("Socket reconnected");
	});
})
sock.connect(options.port,options.host,function(){
	console.log("Socket connected and ready!");
	cliui.startCLI();
});
sock.on("data",function(data){
	console.log(data);
	cliui.readline.prompt();
});
sock.on("end",function(){
	console.log("Socket disconnected, exiting...");
	process.exit(0);
});
cliui.addCommands({
	flag: {
		function: function(onoff){
			if(onoff == "off"){
				sock.write("FLAG = OFF");
			}else{
				sock.write("FLAG = ON");
			}
			this.readline.finished();
		},
		helpText: "Turns the FLAG display on or off"
	},
	page: {
		function: function(page){
			if(page){
				sock.write("LiveText_PageNo = "+page);
			}else{
				console.log("Specify a page number");
			}
			this.readline.finished();
		},
		helpText: "Sends LiveText to the page specified"
	},
	play: {
		function: function(){
			sock.write("LiveText_Play = 1");
			console.log("Playing crawl/scroll");
			this.readline.finished();
		},
		helpText: "Plays an animation, if the current page has one"
	},
	stop: {
		function: function(){
			sock.write("LiveText_Play = 0");
			console.log("Stopped crawl/scroll");
			this.readline.finished();
		},
		helpText: "Stops an animation, if one is playing"
	},
	send: {
		function: function(){
			sock.write([].splice.call(arguments,0).join(" "));
			this.readline.finished();
		},
		helpText: "Sends a literal string to the server"
	}
});
cliui.setHistoryFile(".livetext-client-history");