// Status check
const sites = require('./sites.json');
const https = require('https');
const http = require('http');
const status = require('http-status');

const fs = require('fs');

// Website
const express = require('express');
const app = express();
const pug = require('pug');
const path = require('path');

// Variables
var statuses = {};
var loaded = false;
var updated;

async function updateStatuses() {
  statuses = {};
  for (var i = 0; i < sites.length; i++) {
    let site = sites[i];
    let url = site['url'];
    let name = site['name'];

    let protocol = url.startsWith("https://");
    if (protocol) {
      let startTime = new Date().getTime();
      await https.get(url, function(res) {
        reached(res.statusCode, res.socket._host, url, name, time = new Date().getTime() - startTime);
      }).on('error', function(e) {
        unreachable(e.hostname, url, name, time = new Date().getTime() - startTime);
      });
    } else {
      let startTime = new Date().getTime();
      await http.get(url, function(res) {
        reached(res.statusCode, res.socket._host, url, name, time = new Date().getTime() - startTime);
      }).on('error', function(e) {
        unreachable(e.hostname, url, name, time = new Date().getTime() - startTime);
      });
    }
  }
  setTimeout(updateStatuses, 120000);
}

async function reached(code, host, url, name, time) {
  statuses[host] = {};
  statuses[host].code = code;
  statuses[host].url = url;
  statuses[host].name = name;
  statuses[host].time = time;
  switch (status[`${code}_CLASS`]) {
    case status.classes.INFORMATIONAL:
      // The response code is 1xx
      statuses[host].status = 'INFORMATION';
      statuses[host].color = 'blue';
      break;
    case status.classes.SUCCESSFUL:
      // The response code is 2xx
      statuses[host].status = 'SUCCESS';
      statuses[host].color = 'green';
      break;
    case status.classes.REDIRECTION:
      // The response code is 3xx
      statuses[host].status = 'REDIRECT';
      statuses[host].color = 'yellow';
      break;
    case status.classes.CLIENT_ERROR:
      // The response code is 4xx
      statuses[host].status = 'CLIENT ERROR';
      statuses[host].color = 'red';
      break;
    case status.classes.SERVER_ERROR:
      // The response code is 5xx
      statuses[host].status = 'SERVER ERROR';
      statuses[host].color = 'red';
      break;
    default:
      // Unknown
      statuses[host].status = 'UNKNOWN';
      statuses[host].color = 'grey';
      break;
  }
  publish();
}

function unreachable(host, url, name) {
  statuses[host] = {};
  statuses[host].url = url;
  statuses[host].name = name;
  statuses[host].status = 'UNREACHABLE';
  statuses[host].color = 'red';
  publish();
}

function publish() {
  if (Object.keys(statuses).length === sites.length) {
    statuses = JSON.stringify(statuses, null, 2); // To JSON array
    updated = new Date(Date.now()).toLocaleString('en-US', {
      timeZone: 'America/New_York'
    });
    loaded = true;

    /*fs.writeFile('./statuses.json', statuses, err => {
      if (err) {
          console.log('Error writing file', err)
      } else {
          console.log('Successfully wrote file')
      }
    })*/
  }
}

updateStatuses();

app.set('view engine', 'pug');
app.enable('view cache');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  if (loaded) {
    res.render('index', {statuses, updated});
  } else {
    res.render('generating');
  }
});

app.listen();