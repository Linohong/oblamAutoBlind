// Connect to DB
var express= require('express')
var app = express()
var mysql = require('mysql')
var request = require('request');
var http = require('http');
var cron = require('node-cron');

var weekArray = new Array(7);
weekArray[0]='Sunday'; weekArray[1]='Monday'; weekArray[2]='Tuesday';
weekArray[3]='Wednesday'; weekArray[4]='Thursday'; weekArray[5]='Friday';
weekArray[6]='Saturday';


var connection = mysql.createConnection({
  host : 'localhost',
  user : 'oblam',
  password : 'oblam2017',
  database : 'oblam', 
  timezone : 'utc'
});

connection.connect();

function lightArea(light_input){
  if (light_input >=0 && light_input < 300 ) // very shiny 
    return 0;
  else if (light_input >=300 && light_input < 600) // less shiny
    return 1; 
  else if (light_input >=600 && light_input < 1024) // very dark
    return 2;
}

/*********************
 * SCHEDUEL PER DAY **
 **********************/

var send_light_request = function(para){
  var options;
  var options1 = {
    host : '163.239.201.209',
    port : 3000,
    path : '/sendLight'
  }
  
  var options2 = {
    host : '163.239.201.209',
    port : 3000,
    path : '/stopLight'
  }

  if ( para == 1 ) 
    options = options1
  else
    options = options2
  
  var req = http.get(options, function(res){
    console.log('STATUS AFTER SEND_LIGHT_REQUEST: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
  });
}

var addZero = function(str){
  new_str = '';
  if ( str.length < 2 ){
    new_str += '0'
  }
  return new_str + str;
}

var d = new Date()
var prev_weekday = weekArray[d.getDay()]
var db_query_flag = 0
var forbid_time = '';


cron.schedule('* * * * *', function(){ // cron-1 : CRON FOR LOOP
  // check DB every minute to get current day and corresponding awake time; 
  var d = new Date();
  var weekday = d.getDay(); // 요일
  
  var cur_time = '';
  cur_time += addZero(d.getHours().toString()) + ':';
  cur_time += addZero(d.getMinutes().toString()) + ':';
  cur_time += addZero(d.getSeconds().toString());
  if ( cur_time == forbid_time ){
    send_light_request(1);
  }

  if ( prev_weekday != weekday ){  // if-3 day change then schedule recommendation
    send_light_request(2); 
    var qstr = 'select TIME(time) AS newtime from weekday_waketime where weekday = \'' + weekArray[weekday] + "'"; 
    
    connection.query(qstr, function(err, rows, cols){
      if (err){throw err; res.send('query error: ' + qstr); return;}

      forbid_time = rows[0].newtime
    }); // connetion query ends
  } // if - 3 ends
  prev_weekday = weekday;
  
}); // cron-1 end bracket


/*********************
 * COMPARE WITH DB   **
 **********************/

app.get("/pattern", function(req, res) {
    console.log("data received");
    console.log("param=" + req.query);

    // give query
    var qstr = 'select * from pattern where HOUR(reg_date) = '
    + req.query.hour;

    connection.query(qstr, function(err, rows, cols){
        if (err) {throw err;res.send('query error: ' + qstr);return;}

        // get rows and compare
        for (var i=0; i<rows.length; i++){
          if ( isSameArea(req.query.light, rows[i].light) ){ // if - 1
            if ( rows[i].tag_data == -1 ){ // hasn't been touched ( if - 2
              var options = {
                host : 'http://192.168.0.145',
                port : 3000,
                path : '/pattern?value=' + value
              }
              console.log("PATTERN REQUEST START");
              var req = http.get(options, function(res) {
                console.log('STATUS : ' + res.statusCode);
                console.log('HEADERS : ' + JSON.stringify(res.headers));
              });
              
              var prt = "hour : " + req.query.hour + 
                        " light : " + req.query.light
                       + " pattern : " + rows[i].pattern;
              console.log(prt);
            } // if - 2 ends
          } // if - 1 ends
        } // for loop ends
    }); // end of query
});

app.listen(8080, function(){
    console.log('example app listening on port 8080!')
});
