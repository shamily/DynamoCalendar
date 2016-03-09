var YQL = require('yql');
var _ = require('underscore');
var authorization = require('./authorization.js');
var calendarId = '6ep76cnt1sk803v86lirlk1l0o@group.calendar.google.com';
var calendar = authorization.google.calendar('v3');

var query = new YQL("select * from html where url='http://ua.tribuna.com/dynamo-kiev/calendar/' and xpath='//table[contains(@class,\"stat-table\")]/tbody/tr'");

query.exec( 
  function (error, response) {
    if (error) {
      console.log('There was an error running YQL query: ' + error);
      return;
    }

    var matchlist = [];

    matchlist = scarpingTribuna(response.query.results.tr);

    authorization.getCalendar( 
      function(auth) { 
        updateMatches(auth, matchlist); 
      } 
    );    
  }
);


function updateMatches(auth, ml) {
  var dates = _.pluck(ml, 'date');
  dates = _.map(dates, (date) => {return new Date(date);});
  var minDate = _.min(dates);

  listEvents(auth, minDate, (list) => {
      processEvents(auth, list, ml)
    }
  );
}

function processEvents(auth, list, ml) {
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
}

function addMatch(auth, match) {
  var start = match.date;
  
  var event = {
    'summary': match.title + (match.score ? ' ['+  match.score + ']' : '')  + ' (' + match.tournament + ')' ,
    'description': match.tournament,
  };

  if (match.time) {
    var end = new Date(start);
    end.setHours(2 + start.getHours() );
    event['start'] = {
      'dateTime': start.toISOString(),
      'timeZone': 'Europe/Kiev',
    };

    event['end'] = { 
      'dateTime': end.toISOString(),
      'timeZone': 'Europe/Kiev',
    };
  } else {
    event['start'] = {
      'date': start.toISOString().substring(0, 10),
      'timeZone': 'Europe/Kiev',
    };

    event['end'] = { 
      'date': start.toISOString().substring(0, 10),
      'timeZone': 'Europe/Kiev',
    };      
  }
 
  calendar.events.insert( {
      auth: auth,
      calendarId: calendarId,
      eventId: event.id,
      sendNotifications: false,  
      resource: event
    }
  , function(err, event) {
      if (err) {
        console.log('There was an error contacting the Calendar service: ' + err);
        return;
      }
      // added correctly
    }
  );
}

function deleteMatch(auth, event) {
  calendar.events.delete( {
      auth: auth,
      calendarId: calendarId,
      eventId: event.id
    }
  );
}

function listEvents(auth, minDate, callback) {
  calendar.events.list( {
      auth: auth,
      calendarId: calendarId,
      timeMin: minDate.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    }
  , function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
        
      callback(response.items);
    }
  );
}

function scarpingTribuna(raw) {
  var n = raw.length; // expected is array
  var ml = [];

  for (var i=0; i<n; i++) {
    var m = raw[i].td;
    var dt = m[0];
    var dtour = m[1];
    var dcomp = m[2];
    var dhome = m[3];
    var dscore = m[4];
    
    // DATE AND TIME (dt)
    var datetime = dt.content;
    var re = datetime.match(/(\d\d)\.(\d\d)\.(\d\d\d\d)((\d\d)[:](\d\d)){0,1}/);
    var date = re[4] ? new Date(re[3], re[2]-1, re[1], re[5], re[6]) : new Date(re[3], re[2]-1, re[1]);
    var time = re[4];

    // TOURNAMENT
    var tour = dtour.div.a.title;   
    
    // COMPETITOR 
    var comp = dcomp.div.a.title;
    var compCountry = dcomp.div.i[1].title;

    // HOME or AWAY
    var where = dhome.content;
    var title = 'Дома' == where ? 'Динамо - ' + comp : comp + ' - Динамо'; 
    
    // SCORE
    var score = dscore.a.noindex ? dscore.a.noindex.b : null;
      
      ml.push( {
          title: title,
          tournament: tour,
          id: null,
          date: date,
          time: time,
          notes: '',
          score: score        
      } );

  }

  return ml;
}