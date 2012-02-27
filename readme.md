LiveText Control is a Node.js script and set of accompanying utilities to remotely manage various variables and images in NewTek LiveText.
# Features
- Managing comprehensive scoreboard graphics control from a web interface
- Managing comprehensive telethon graphics control from a web interface
- Live display of drawings from an iPad in LiveText
- Receiving variables from standard LiveText-formatted text files
- Control playing and stopping movement in LiveText from a web interface
- Setting LiveText to an arbitrary page from a web interface
- Written in Node.js using Google Chrome's V8 JS engine
# Prerequisites
- NewTek LiveText
- A NewTek Tricaster that can take LiveText input
- Node.js (from [nodejs.org](http://nodejs.org/ nodejs.org)), a server-side JS platform using Google Chrome's V8 JS engine
# Usage
## Syntax
For usage instructions, navigate in a command prompt to the root folder of the repository and run the command `node Server.js --help`
This will present a set of options for the program.
The arguments of Server.js are:
+ -i <file>: Poll this file for input. Whenever this file is modified, its contents will be parsed for variables. (supports multiple of this argument)
+ -s: Set the computer to begin acting as a wireless access point when the program starts (for when the computer is wired in and an iPad is in use)
+ -l <file>: Parse this file once on start (for presets) (supports multiple of this argument)
+ -o <file>: Write the output to this location (usually in NewTek Program Files)
+ -p <port>: Listen on this port for the primary socke server (not currently used)
+ -h <port>: Listen on this port for the HTTP server (defaults to 8990)
There will soon be an option for generating a program you can simply double-click to edit
## Running the program
## Using the web interface
Navigate using a web browser to http://localhost:8990/
