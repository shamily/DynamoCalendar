# Dynamo Calendar

## Objective

Script that updates matches calendar for a football team ("Dynamo" Kyiv, Ukraine) basing on available calendar in the web. It's planned to run this script once a day. It will: 
* Add scores to the passed matches.
* Add new matches in case something added to the schedule
* Specify specific time for the matches once available

## Calendar usage

You may simply add the calendar at https://calendar.google.com by looking for ``6ep76cnt1sk803v86lirlk1l0o@group.calendar.google.com ``. The calendar is in Russian language, as the source.

## Possible future updates

* Make smart updates of the existing events in the calendar (instead of simply deleting / adding)
* Make it possible to use plug-ins for scarping, so any team may be added.
* Add more details for the passed matches (who scored, statistics, text comments, links reviews, press conferences etc)
* 

*DISCLAIMER: I don't say I'm going to implement it by myself!*

## Tech Overview

Used the following stuff:
* Node.js® (https://nodejs.org/)
* Google Calendar API (https://developers.google.com/google-apps/calendar/) 
* Yahoo Query Language (YQL) for web scraping (https://developer.yahoo.com/yql/)
* Underscore.js (http://underscorejs.org/) - for some manipulations with collections

## Run it!

In case you would like to play with the concept and code, you should do the following:

* Setup the latest Node.js and npm

```bash
git clone https://github.com/shamily/DynamoCalendar
npm install
```

* Authorize Google API access according to the article https://developers.google.com/google-apps/calendar/quickstart/nodejs. 
* The code from quickstart.js from the article is in authorize.js source file with minor changes, so you don't need to recreate it. After the first start this code will ask to confirm the access to the calendar.
* As you may see, I don't share the keys for my calendar (should I?), so you will need to create your own calendar and point the code to it.

```bash
node app
```

## Web Scarping with YQL

While working on this I first time met the YQL (https://developer.yahoo.com/yql/) and liked it! It allows to query the web site as if it was an SQL db and much more than that. Also it allows to play with in console before you go: https://developer.yahoo.com/yql/console/

## Limitiation of Google Calendar API usage

The script currently calls the Calendar API about 100 times during its run. This creates and issue, since the API allows to send 10 requests per second. I briefly reviewed possible solutions for the issue and didn't find any appropriate, so implemented mine tiny async job processor based on setInterval:

```javascript
  // setup job queue
  var tasks = [];
  var curr = 0;
  var q = setInterval(function() {
    if (tasks.length <=curr) return;
    console.log('Processing task: ' + tasks[curr].name);
    tasks[curr].task();
    curr++;      
  }, 300);

  // remove all the records starting from the minimal date
  _.each(list, (e) => {
      tasks.push( {
          name: 'deleteMatch: ' + e.id,
          task: function() { 
            deleteMatch(auth, e); 
          }
        }
      );            
    }
  );

  // add events  
  _.each(ml, (m) => {
      tasks.push( {
        name: 'addMatch: ' + m.title,
        task: function() { 
            addMatch(auth, m); 
          }
        }
      );            
    }
  );

  // stop queue
  tasks.push( {
      name: 'clearInterval',
      task: function() {
        clearInterval(q); 
      }
    }
  );  
```
