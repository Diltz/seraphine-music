# What is it
This is my discord music bot that I wrote for my private community server.
Currently it supports next commands:

<b>/play [search]</b> <i>(search can be text, url, playlist)</i> <b>(YouTube only)</b><br>
<b>/queue</b> <i>(Returns current queue)<br></i>
<b>/skip</b> <i>(Skip current track)<br></i>
<b>/stop</b> <i>(Stops current track and clears queue)<br></i>

# Requirements
<b>NodeJS</b> (v18+)<br>
<b>FFmpeg</b> installed (i don't recommend using npm ffmpeg, cuz it's bad)

# Language
I haven't translated messages, so it replies on Russian language, you have to manually edit all ts scripts to set your preferred language

# Installation
Want to try it out?<br>
Here's steps:
<li><b>Install FFmpeg</b> - if you are hosting on ubuntu use <b>apt-get install ffmpeg -y</b></li>
<li><b>Install typescript</b> - npm install typescript --save-dev</b></li>
<li><b>Clone repository</b> - git clone https://github.com/Diltz/seraphine-music.git</li>
<li><b>Create .env file inside directory</b> - use .env.example as reference</li>
<li><b>Install packages</b> - npm i</li>
<li><b>Build application</b> - tsc</li>
<li><b>Run application</b> - pm2 start ./dist/index.js --name seraphine <b>OR</b> npm start</li>
