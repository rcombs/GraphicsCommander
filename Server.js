#! /usr/bin/env node

/*
Copyright (C) 2012 Rodger Combs.
The program enclosed in this directory (herein the PROGRAM) is provided by Rodger Combs (herein the AUTHOR) for use by any individual or company (herein the USER) in conjunction with character generator software (herein RELATED SOFTWARE) under any of the three (3) conditions listed below:
	1. The USER uses the PROGRAM solely for non-commercial and/or non-profit use, including, but not limited to, and at the sole discretion of the AUTHOR:
		a. Schools
		b. Churches
		c. Charities
		d. Other USERs who do not profit from use of the PROGRAM or RELATED SOFTWARE
	2. Both of the following conditions are fulfilled:
		a. The USER has received express permission from the AUTHOR to use the PROGRAM, including, but not limited to, permission granted as a result of a purchase from the AUTHOR
		b. Any conditions specified by the AUTHOR for use of the PROGRAM by the USER are followed
	3. The USER intends to profit from use of the PROGRAM, LIVETEXT, or RELATED PRODUCTS, but will not profit from the current use of the PROGRAM, including, but not limited to, a USER who wishes to test the functionality of the PROGRAM or its usefulness in their workflow.
	 
Any use of the PROGRAM that does not fulfill one of these conditions is prohibited.

If a USER is licensed for use of the PROGRAM under the above license, then that USER is licensed to modify any portion of the PROGRAM with the exception of this license statement. Such a modified version of the PROGRAM may NOT be redistributed to any other USER except when expressly permitted by the AUTHOR. If the USER is unable or unwilling to make a necessary modification, then the USER may submit a feature request or bug report at the GITHUB ISSUES PAGE at https://github.com/11rcombs/LiveText-Control/issues

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


"use strict";
var VERSION = 2.0;
var path = require("path"),
	fs = require("fs");
	
var configFile = process.argv[2];

if(!configFile){
	if(fs.existsSync("config.json")){
		configFile = "config.json";
	}else{
		console.error("Specify a config file!");
		process.exit(1);
	}
}

/*
Example Config File:
{
	presets: {},
	modules: [
		http: {
			port: 8990
		},
		chyron: {
			port: 23,
			host: 192.168.1.104
			tab: {
				message: 1,
				descriptor: 1,
				list: ["HScore", "VScore", "GameClk", "DownAndToGo", "BallOn", "Period"]
			},
		},
		hostedNetwork: true,
		outFile: {
			path: "/path/to/file.txt"
		},
		inFile: {
			files: ["/path/to/file.txt"]
		}
	];
}
*/

var flags = {};

var config = JSON.parse(fs.readFileSync(configFile));

var modules = {
	in: [],
	io: [],
	out: [],
	edit: [],
	util: []
};

function runEdits(inFlags){
	var outFlags = JSON.parse(JSON.stringify(inFlags)); // FIXME: Optimize this line?
	for(var i = 0; i < modules.edit.length; i++){
		outFlags = modules.edit[i].editFlags(outFlags);
	}
	return outFlags;
}

function sendOuts(){
	var finalFlags = runEdits(flags);
	var outModules = modules.io.concat(modules.out);
	for(var i = 0; i < outModules.length; i++){
		outModules[i].writeFlags(finalFlags);
	}
}

for(var i in config.modules){
	if(!config.modules[i]){
		continue;
	}
	var mod = require(path.join(__dirname, "modules", i));
	var instance = new mod(config.modules[i]);
	modules[mod.type].push(instance);
	switch(mod.type){
		case "in":
		case "io":
			instance.on("flags", function(inFlags){
				for(var i in inFlags){
					flags[i] = inFlags[i];
					sendOuts();
				}
			});
			break;
		case "out":
		case "edit":
		default:
			// Do something here? I'm not sure.
			break;
	}
}