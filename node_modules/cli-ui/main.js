#!/usr/bin/env node
const VERSION = "0.1.0";
var path = require("path");
var fs = require("fs");
if(!exports){
    exports = {};
}
function completer(text){
    var commandList = Object.keys(commands);
    var completions = [];
    for(var i = 0; i < commandList.length; i++){
        if(commandList[i].indexOf(text) == 0){
            completions.push(commandList[i]);
        }
    }
    return [completions,text];
}
var readline = require("readline").createInterface(process.stdin,process.stdout,completer);
readline.finished = function(){
    this.history = this.oldHistory;
    if(options.historyFile){
        fs.writeFile(options.historyFile,this.history.join("\n"));
    }
    this.prompt();
}
var options = {
    programName: "",
    programVersion: "",
    promptCharacter: "$ "
};
var global = {
    readline: readline,
    runCommand: parseCommand
};
var commands = {
    help: {    
        function: function(command){
            if(command){
                if(commands[command]){
                    if(commands[command].helpText){
                        process.stdout.write(commands[command].helpText+"\n");
                    }else{
                        process.stdout.write("No help available for "+command+"\n");
                    }
                }
            }else{
                process.stdout.write("List of available commands:\n");
                for(var i in commands){
                    process.stdout.write(i+"\n");
                }
                process.stdout.write("Type help [command] for help with a specific command");
            }
            this.readline.prompt();
        },
        helpText: "Lists available commands and gets help on individual commands"
    },
    quit: {
        function: function(){
            readline.close();
            process.exit(0);
        },
        helpText: "Ends the process"
    },
    exit: {
        alias: "quit",
        helpText: "Alias to quit"
    }
};
function parseCommand(command){
    var argv = command.split(" ");
    if(commands[argv[0]]){
        if(commands[argv[0]].alias){
            parseCommand(commands[argv[0]].alias);
        }else{
            readline.oldHistory = readline.history.concat();
            var ret = commands[argv[0]].function.apply(global,argv.slice(1));
        }
    }else if(argv[0] == ""){
        readline.prompt();
    }else{
        console.log("No such command!");
        readline.prompt();
    }
}
function listenForCommand(){
    readline.setPrompt(options.promptCharacter);
    readline.prompt();
    readline.on("line",function(line){
        parseCommand(line);
    });
}
exports.setHistoryFile = function(filename){
    if(!filename){
        throw new Error("No filename!");
    }
    filename = filename.replace("~",process.env.HOME);
    options.historyFile = filename;
    if(!path.existsSync(filename)){
        fs.writeFileSync(filename,"");
        return;
    }
    var history = fs.readFileSync(filename,"utf8");
    if(!history){
        return;
    }
    readline.history = history.split("\n");
}
exports.setOptions = function(optionsArr){
    for(var i in optionsArr){
        options[i] = optionsArr[i];
    }
}
exports.setOption = function(key,value){
    options[key] = value;
}
exports.addCommands = function(commandsArr){
    for(var i in commandsArr){
        commands[i] = commandsArr[i];
    }
}
exports.addCommand = function(name,command){
    commands[name] = command;
}
exports.removeCommand = function(name){
    delete commands[name];
}
exports.startCLI = function(){
    process.stdout.write((options.programName?(options.programName+(options.programVersion?(" v"+options.programVersion):"") +" using "):"")+"CLI-UI v"+VERSION+" running Node.js "+process.version+".\nType help for commands.\n");
    if(options.init){
        options.init.call(global,options);
    }
    listenForCommand();
}